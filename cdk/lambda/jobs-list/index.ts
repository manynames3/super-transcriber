import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { errorResponse, getUserId, jsonResponse } from "../shared";

interface JobListItem {
  createdAt: string;
  deleted?: boolean;
  durationSeconds?: number;
  failureReason?: string;
  fileName: string;
  jobId: string;
  status: string;
  updatedAt: string;
  wordCount?: number;
}

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

    const requestedLimit = Number.parseInt(event.queryStringParameters?.limit ?? "20", 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 20)
      : 20;

    let exclusiveStartKey:
      | {
          PK: string;
          SK: string;
        }
      | undefined;

    if (event.queryStringParameters?.cursor) {
      try {
        exclusiveStartKey = JSON.parse(
          Buffer.from(event.queryStringParameters.cursor, "base64url").toString("utf8"),
        ) as { PK: string; SK: string };
      } catch {
        return errorResponse(400, "INVALID_CURSOR", "The pagination cursor is invalid.");
      }
    }

    const items: JobListItem[] = [];
    let lastEvaluatedKey = exclusiveStartKey;

    while (items.length < limit) {
      const remaining = limit - items.length;
      const result = await dynamo.send(
        new QueryCommand({
          TableName: tableName,
          ExclusiveStartKey: lastEvaluatedKey,
          ExpressionAttributeValues: {
            ":false": false,
            ":pk": `USER#${userId}`,
            ":skPrefix": "JOB#",
          },
          FilterExpression: "attribute_not_exists(deleted) OR deleted = :false",
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
          Limit: remaining,
          ScanIndexForward: false,
        }),
      );

      const batch = (result.Items ?? []) as JobListItem[];
      items.push(...batch);
      lastEvaluatedKey = result.LastEvaluatedKey as { PK: string; SK: string } | undefined;

      if (!lastEvaluatedKey) {
        break;
      }
    }

    return jsonResponse(200, {
      items: items.map((item) => ({
        createdAt: item.createdAt,
        durationSeconds: item.durationSeconds ?? 0,
        failureReason: item.failureReason ?? "",
        fileName: item.fileName,
        jobId: item.jobId,
        status: item.status,
        updatedAt: item.updatedAt,
        wordCount: item.wordCount ?? 0,
      })),
      nextCursor: lastEvaluatedKey
        ? Buffer.from(JSON.stringify(lastEvaluatedKey), "utf8").toString("base64url")
        : null,
    });
  } catch (error) {
    console.error("jobs-list failed", error);
    return errorResponse(500, "JOBS_LIST_ERROR", "Failed to fetch transcription jobs.");
  }
};
