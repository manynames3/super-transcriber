import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { createAuditEvent, errorResponse, getUserId, isValidJobId, jsonResponse } from "../shared";

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

    const jobId = event.pathParameters?.jobId;
    if (!jobId || !isValidJobId(jobId)) {
      return errorResponse(400, "INVALID_JOB_ID", "A valid jobId path parameter is required.");
    }

    const now = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `JOB#${jobId}`,
        },
        UpdateExpression:
          "SET deleted = :deleted, updatedAt = :updatedAt, auditTrail = list_append(if_not_exists(auditTrail, :emptyAuditTrail), :auditTrail)",
        ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
        ExpressionAttributeValues: {
          ":auditTrail": [
            createAuditEvent(
              "JOB_SOFT_DELETED",
              "Authenticated user soft-deleted this job. S3 lifecycle policies handle object expiration.",
              "USER",
              now,
            ),
          ],
          ":deleted": true,
          ":emptyAuditTrail": [],
          ":updatedAt": now,
        },
      }),
    );

    return jsonResponse(200, {
      jobId,
      success: true,
    });
  } catch (error) {
    console.error("job-delete failed", error);
    return errorResponse(500, "JOB_DELETE_ERROR", "Failed to delete the transcription job.");
  }
};
