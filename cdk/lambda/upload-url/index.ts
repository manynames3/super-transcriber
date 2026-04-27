import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ulid } from "ulid";
import { errorResponse, getUserId, jsonResponse } from "../shared";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const tableName = process.env.DYNAMODB_TABLE_NAME;
const uploadBucketName = process.env.UPLOAD_BUCKET_NAME;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!tableName || !uploadBucketName) {
      return errorResponse(500, "CONFIG_ERROR", "Server configuration is incomplete.");
    }

    const userId = getUserId(event);
    if (!userId) {
      return errorResponse(401, "UNAUTHORIZED", "Unable to resolve the authenticated user.");
    }

    const activeJobs = await dynamo.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        FilterExpression: "(attribute_not_exists(deleted) OR deleted = :notDeleted) AND #status <> :completed",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":completed": "COMPLETED",
          ":notDeleted": false,
          ":pk": `USER#${userId}`,
          ":skPrefix": "JOB#",
        },
        Select: "COUNT",
      }),
    );

    if ((activeJobs.Count ?? 0) >= 5) {
      return errorResponse(429, "ACTIVE_JOB_LIMIT", "You already have 5 active transcription jobs.");
    }

    const jobId = ulid();
    const s3Key = `uploads/${userId}/${jobId}/audio.mp3`;
    const presignedUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: uploadBucketName,
        ContentType: "audio/mpeg",
        Key: s3Key,
      }),
      { expiresIn: 900 },
    );

    return jsonResponse(200, {
      jobId,
      presignedUrl,
      s3Key,
    });
  } catch (error) {
    console.error("upload-url failed", error);
    return errorResponse(500, "UPLOAD_URL_ERROR", "Failed to create an upload URL.");
  }
};
