import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ulid } from "ulid";
import { errorResponse, jsonResponse, parseJsonBody } from "../shared";

interface EnterpriseLeadBody {
  company?: string;
  email?: string;
  message?: string;
  name?: string;
  timeline?: string;
  useCase?: string;
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.DYNAMODB_TABLE_NAME;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!tableName) {
      return errorResponse(500, "CONFIG_ERROR", "Server configuration is incomplete.");
    }

    const body = parseJsonBody<EnterpriseLeadBody>(event.body);
    const email = clean(body?.email, 320);
    const company = clean(body?.company, 120);
    const name = clean(body?.name, 120);
    const useCase = clean(body?.useCase, 80);
    const timeline = clean(body?.timeline, 80);
    const message = clean(body?.message, 2000);

    if (!email || !company || !name || !isValidEmail(email)) {
      return errorResponse(400, "INVALID_LEAD", "Name, company, and a valid email are required.");
    }

    const leadId = ulid();
    const now = new Date().toISOString();
    await dynamo.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: `LEAD#${leadId}`,
          SK: `LEAD#${leadId}`,
          company,
          createdAt: now,
          email,
          leadId,
          message,
          name,
          source: "enterprise-v2-landing",
          status: "NEW",
          timeline,
          type: "ENTERPRISE_LEAD",
          updatedAt: now,
          useCase,
        },
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      }),
    );

    return jsonResponse(201, {
      leadId,
      success: true,
    });
  } catch (error) {
    console.error("enterprise-lead failed", error);
    return errorResponse(500, "ENTERPRISE_LEAD_ERROR", "Failed to submit the private deployment inquiry.");
  }
};

function clean(value: string | undefined, maxLength: number): string {
  return (value ?? "").trim().slice(0, maxLength);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
