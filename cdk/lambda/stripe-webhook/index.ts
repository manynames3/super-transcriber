import { createHmac, timingSafeEqual } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  BILLING_SK,
  createAuditEvent,
  errorResponse,
  isPaidSubscriptionStatus,
  jsonResponse,
  normalizeBillingPlan,
} from "../shared";

interface StripeEvent {
  data?: {
    object?: StripeObject;
  };
  id?: string;
  type?: string;
}

interface StripeObject {
  client_reference_id?: string;
  current_period_end?: number;
  customer?: string;
  id?: string;
  metadata?: Record<string, string | undefined>;
  status?: string;
  subscription?: string;
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.DYNAMODB_TABLE_NAME;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!tableName) {
      return errorResponse(500, "CONFIG_ERROR", "Server configuration is incomplete.");
    }

    if (!isConfigured(stripeWebhookSecret)) {
      return errorResponse(503, "STRIPE_WEBHOOK_NOT_CONFIGURED", "Stripe webhook verification is not configured.");
    }

    const payload = event.isBase64Encoded
      ? Buffer.from(event.body ?? "", "base64").toString("utf8")
      : (event.body ?? "");
    const signatureHeader = getHeader(event.headers, "stripe-signature");
    if (!payload || !signatureHeader || !verifyStripeSignature(payload, signatureHeader, stripeWebhookSecret)) {
      return errorResponse(400, "INVALID_STRIPE_SIGNATURE", "Stripe webhook signature verification failed.");
    }

    const stripeEvent = JSON.parse(payload) as StripeEvent;
    const stripeObject = stripeEvent.data?.object;
    if (!stripeObject) {
      return jsonResponse(200, { received: true });
    }

    if (stripeEvent.type === "checkout.session.completed") {
      await upsertBillingFromCheckout(stripeObject);
      return jsonResponse(200, { received: true });
    }

    if (stripeEvent.type === "customer.subscription.updated" || stripeEvent.type === "customer.subscription.deleted") {
      await upsertBillingFromSubscription(stripeObject, stripeEvent.type);
      return jsonResponse(200, { received: true });
    }

    return jsonResponse(200, { received: true });
  } catch (error) {
    console.error("stripe-webhook failed", error);
    return errorResponse(500, "STRIPE_WEBHOOK_ERROR", "Failed to process Stripe webhook.");
  }
};

function isConfigured(value: string | undefined): value is string {
  return Boolean(value && value !== "not_configured");
}

async function upsertBillingFromCheckout(session: StripeObject) {
  const userId = session.client_reference_id ?? session.metadata?.userId;
  if (!userId) {
    console.warn("Stripe checkout session missing userId", { sessionId: session.id });
    return;
  }

  const plan = normalizeBillingPlan(session.metadata?.plan);
  const now = new Date().toISOString();
  await dynamo.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: BILLING_SK,
      },
      UpdateExpression:
        "SET plan = :plan, stripeCustomerId = :customerId, stripeSubscriptionId = :subscriptionId, subscriptionStatus = :subscriptionStatus, updatedAt = :now, auditTrail = list_append(if_not_exists(auditTrail, :emptyAuditTrail), :auditTrail)",
      ExpressionAttributeValues: {
        ":auditTrail": [
          createAuditEvent(
            "BILLING_SUBSCRIPTION_UPDATED",
            `Stripe checkout completed for the ${plan} plan.`,
            "SYSTEM",
            now,
          ),
        ],
        ":customerId": session.customer ?? "",
        ":emptyAuditTrail": [],
        ":now": now,
        ":plan": plan,
        ":subscriptionId": session.subscription ?? "",
        ":subscriptionStatus": "active",
      },
    }),
  );
}

async function upsertBillingFromSubscription(subscription: StripeObject, eventType: string) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.warn("Stripe subscription missing userId metadata", { subscriptionId: subscription.id });
    return;
  }

  const rawPlan = normalizeBillingPlan(subscription.metadata?.plan);
  const subscriptionStatus = eventType === "customer.subscription.deleted" ? "canceled" : (subscription.status ?? "unknown");
  const plan = isPaidSubscriptionStatus(subscriptionStatus) ? rawPlan : "free";
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const now = new Date().toISOString();

  await dynamo.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: BILLING_SK,
      },
      UpdateExpression:
        "SET currentPeriodEnd = :currentPeriodEnd, plan = :plan, stripeCustomerId = :customerId, stripeSubscriptionId = :subscriptionId, subscriptionStatus = :subscriptionStatus, updatedAt = :now, auditTrail = list_append(if_not_exists(auditTrail, :emptyAuditTrail), :auditTrail)",
      ExpressionAttributeValues: {
        ":auditTrail": [
          createAuditEvent(
            "BILLING_SUBSCRIPTION_UPDATED",
            `Stripe subscription status changed to ${subscriptionStatus}.`,
            "SYSTEM",
            now,
          ),
        ],
        ":currentPeriodEnd": currentPeriodEnd,
        ":customerId": subscription.customer ?? "",
        ":emptyAuditTrail": [],
        ":now": now,
        ":plan": plan,
        ":subscriptionId": subscription.id ?? "",
        ":subscriptionStatus": subscriptionStatus,
      },
    }),
  );
}

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string): boolean {
  const parts = signatureHeader.split(",").reduce<Record<string, string[]>>((accumulator, part) => {
    const [key, value] = part.split("=");
    if (!key || !value) {
      return accumulator;
    }

    accumulator[key] = [...(accumulator[key] ?? []), value];
    return accumulator;
  }, {});
  const timestamp = parts.t?.[0];
  const signatures = parts.v1 ?? [];
  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return signatures.some((signature) => timingSafeEqualHex(signature, expectedSignature));
}

function timingSafeEqualHex(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function getHeader(headers: Record<string, string | undefined>, name: string): string | null {
  const lowerName = name.toLowerCase();
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName);
  return match?.[1] ?? null;
}
