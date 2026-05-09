import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  BILLING_SK,
  createAuditEvent,
  errorResponse,
  getUserEmail,
  getUserId,
  jsonResponse,
  parseJsonBody,
} from "../shared";

interface CheckoutBody {
  plan?: string;
}

interface StripeCheckoutSession {
  id: string;
  url?: string;
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.DYNAMODB_TABLE_NAME;
const appBaseUrl = process.env.APP_BASE_URL;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeProPriceId = process.env.STRIPE_PRO_PRICE_ID;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!tableName) {
      return errorResponse(500, "CONFIG_ERROR", "Server configuration is incomplete.");
    }

    if (!isConfigured(stripeSecretKey) || !isConfigured(stripeProPriceId) || !appBaseUrl) {
      return errorResponse(
        503,
        "STRIPE_NOT_CONFIGURED",
        "Subscription checkout is not configured yet. Add Stripe secrets and price IDs to enable upgrades.",
      );
    }

    const userId = getUserId(event);
    if (!userId) {
      return errorResponse(401, "UNAUTHORIZED", "Unable to resolve the authenticated user.");
    }

    const body = parseJsonBody<CheckoutBody>(event.body);
    if (body?.plan !== "pro") {
      return errorResponse(400, "INVALID_PLAN", "Only the Pro hosted plan supports self-serve checkout.");
    }

    const email = getUserEmail(event);
    const params = new URLSearchParams({
      "allow_promotion_codes": "true",
      "client_reference_id": userId,
      "line_items[0][price]": stripeProPriceId,
      "line_items[0][quantity]": "1",
      "metadata[plan]": "pro",
      "metadata[userId]": userId,
      "mode": "subscription",
      "subscription_data[metadata][plan]": "pro",
      "subscription_data[metadata][userId]": userId,
      "success_url": `${appBaseUrl}/dashboard?checkout=success`,
      "cancel_url": `${appBaseUrl}/dashboard?checkout=cancelled`,
    });

    if (email) {
      params.set("customer_email", email);
    }

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      body: params,
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    if (!stripeResponse.ok) {
      const stripeError = await stripeResponse.text();
      console.error("Stripe checkout failed", stripeError);
      return errorResponse(502, "STRIPE_CHECKOUT_ERROR", "Stripe could not create a checkout session.");
    }

    const session = (await stripeResponse.json()) as StripeCheckoutSession;
    if (!session.url) {
      return errorResponse(502, "STRIPE_CHECKOUT_ERROR", "Stripe did not return a checkout URL.");
    }

    const now = new Date().toISOString();
    await dynamo.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: BILLING_SK,
        },
        UpdateExpression:
          "SET checkoutSessionId = :checkoutSessionId, checkoutStartedAt = :now, planRequested = :plan, updatedAt = :now, auditTrail = list_append(if_not_exists(auditTrail, :emptyAuditTrail), :auditTrail)",
        ExpressionAttributeValues: {
          ":auditTrail": [
            createAuditEvent("BILLING_CHECKOUT_STARTED", "User started Stripe Checkout for the Pro plan.", "USER", now),
          ],
          ":checkoutSessionId": session.id,
          ":emptyAuditTrail": [],
          ":now": now,
          ":plan": "pro",
        },
      }),
    );

    return jsonResponse(200, {
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("billing-checkout failed", error);
    return errorResponse(500, "BILLING_CHECKOUT_ERROR", "Failed to start subscription checkout.");
  }
};

function isConfigured(value: string | undefined): value is string {
  return Boolean(value && value !== "not_configured");
}
