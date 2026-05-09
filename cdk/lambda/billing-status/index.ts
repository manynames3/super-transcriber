import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  BILLING_SK,
  currentUsagePeriod,
  errorResponse,
  getBillingPlanLimits,
  getUserId,
  isPaidSubscriptionStatus,
  jsonResponse,
  normalizeBillingPlan,
  usageSkForPeriod,
} from "../shared";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.DYNAMODB_TABLE_NAME;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!tableName) {
      return errorResponse(500, "CONFIG_ERROR", "Server configuration is incomplete.");
    }

    const userId = getUserId(event);
    if (!userId) {
      return errorResponse(401, "UNAUTHORIZED", "Unable to resolve the authenticated user.");
    }

    const period = currentUsagePeriod();
    const [billingResult, usageResult] = await Promise.all([
      dynamo.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            PK: `USER#${userId}`,
            SK: BILLING_SK,
          },
        }),
      ),
      dynamo.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            PK: `USER#${userId}`,
            SK: usageSkForPeriod(period),
          },
        }),
      ),
    ]);

    const billingItem = billingResult.Item as
      | {
          currentPeriodEnd?: string;
          plan?: string;
          stripeCustomerId?: string;
          stripeSubscriptionId?: string;
          subscriptionStatus?: string;
          updatedAt?: string;
        }
      | undefined;
    const plan =
      billingItem && isPaidSubscriptionStatus(billingItem.subscriptionStatus)
        ? normalizeBillingPlan(billingItem.plan)
        : "free";
    const limits = getBillingPlanLimits(plan);
    const transcriptsStarted = Number((usageResult.Item as { transcriptsStarted?: number } | undefined)?.transcriptsStarted ?? 0);

    return jsonResponse(200, {
      currentPeriodEnd: billingItem?.currentPeriodEnd ?? null,
      limits,
      plan,
      stripeConfigured: isConfigured(process.env.STRIPE_SECRET_KEY) && isConfigured(process.env.STRIPE_PRO_PRICE_ID),
      stripeCustomerId: billingItem?.stripeCustomerId ?? null,
      stripeSubscriptionId: billingItem?.stripeSubscriptionId ?? null,
      subscriptionStatus: billingItem?.subscriptionStatus ?? "free",
      transcriptsRemaining: Math.max(0, limits.monthlyTranscriptLimit - transcriptsStarted),
      transcriptsUsed: transcriptsStarted,
      updatedAt: billingItem?.updatedAt ?? null,
      usagePeriod: period,
    });
  } catch (error) {
    console.error("billing-status failed", error);
    return errorResponse(500, "BILLING_STATUS_ERROR", "Failed to load billing status.");
  }
};

function isConfigured(value: string | undefined): boolean {
  return Boolean(value && value !== "not_configured");
}
