import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ulid } from "ulid";
import {
  BILLING_SK,
  buildUploadS3Key,
  currentUsagePeriod,
  errorResponse,
  getBillingPlanLimits,
  getUserId,
  isPaidSubscriptionStatus,
  jsonResponse,
  normalizeBillingPlan,
  normalizeSupportedAudioExtension,
  parseJsonBody,
  usageSkForPeriod,
} from "../shared";

interface UploadUrlBody {
  fileExtension?: string;
}

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

    const body = parseJsonBody<UploadUrlBody>(event.body);
    const fileExtension = normalizeSupportedAudioExtension(body?.fileExtension);
    if (!fileExtension) {
      return errorResponse(400, "INVALID_FILE_EXTENSION", "fileExtension must be mp3 or m4a.");
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

    const billingItem = billingResult.Item as { plan?: string; subscriptionStatus?: string } | undefined;
    const plan =
      billingItem && isPaidSubscriptionStatus(billingItem.subscriptionStatus)
        ? normalizeBillingPlan(billingItem.plan)
        : "free";
    const limits = getBillingPlanLimits(plan);
    const transcriptsStarted = Number((usageResult.Item as { transcriptsStarted?: number } | undefined)?.transcriptsStarted ?? 0);

    if (transcriptsStarted >= limits.monthlyTranscriptLimit) {
      return errorResponse(
        402,
        "PLAN_TRANSCRIPT_LIMIT",
        `${limits.label} includes ${limits.monthlyTranscriptLimit} transcripts per month. Upgrade to continue.`,
      );
    }

    const jobId = ulid();
    const s3Key = buildUploadS3Key(userId, jobId, fileExtension);
    const presignedUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: uploadBucketName,
        Key: s3Key,
      }),
      { expiresIn: 900 },
    );

    return jsonResponse(200, {
      fileExtension,
      jobId,
      presignedUrl,
      s3Key,
    });
  } catch (error) {
    console.error("upload-url failed", error);
    return errorResponse(500, "UPLOAD_URL_ERROR", "Failed to create an upload URL.");
  }
};
