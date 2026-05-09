import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  StartTranscriptionJobCommand,
  TranscribeClient,
} from "@aws-sdk/client-transcribe";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  errorResponse,
  extractAudioObjectDetailsFromS3Key,
  extractJobIdFromS3Key,
  formatDurationSeconds,
  getUserId,
  isOwnedUploadKey,
  jsonResponse,
  parseJsonBody,
} from "../shared";

interface TranscribeBody {
  durationSeconds?: number;
  fileName?: string;
  s3Key?: string;
  speakerCount?: number;
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const transcribe = new TranscribeClient({});
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

    const body = parseJsonBody<TranscribeBody>(event.body);
    if (!body?.s3Key || !body.fileName) {
      return errorResponse(400, "INVALID_REQUEST", "s3Key and fileName are required.");
    }

    if (!isOwnedUploadKey(userId, body.s3Key)) {
      return errorResponse(403, "S3_KEY_FORBIDDEN", "The requested S3 object does not belong to you.");
    }

    const jobId = extractJobIdFromS3Key(body.s3Key);
    if (!jobId) {
      return errorResponse(400, "INVALID_JOB_ID", "The S3 key does not contain a valid job ID.");
    }

    const audioObjectDetails = extractAudioObjectDetailsFromS3Key(body.s3Key);
    if (!audioObjectDetails) {
      return errorResponse(400, "INVALID_MEDIA_FORMAT", "Only mp3 and m4a uploads are supported.");
    }

    const speakerCount = body.speakerCount === 2 ? 2 : 2;
    const durationSeconds = formatDurationSeconds(body.durationSeconds ?? 0);
    const timestamp = Date.now();
    const transcribeJobName = `super-transcriber-${jobId}-${timestamp}`;
    const now = new Date().toISOString();

    const existingJob = await dynamo.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `JOB#${jobId}`,
        },
      }),
    );

    const existingItem = existingJob.Item as
      | {
          deleted?: boolean;
          status?: string;
        }
      | undefined;

    if (existingItem?.deleted) {
      return errorResponse(409, "JOB_DELETED", "This transcription job has been deleted.");
    }

    if (existingItem && existingItem.status && !["FAILED", "COMPLETED"].includes(existingItem.status)) {
      return errorResponse(409, "JOB_ALREADY_ACTIVE", "This transcription job is already in progress.");
    }

    await transcribe.send(
      new StartTranscriptionJobCommand({
        LanguageCode: "en-US",
        Media: {
          MediaFileUri: `s3://${uploadBucketName}/${body.s3Key}`,
        },
        MediaFormat: audioObjectDetails.mediaFormat,
        Settings: {
          MaxSpeakerLabels: speakerCount,
          ShowSpeakerLabels: true,
        },
        TranscriptionJobName: transcribeJobName,
      }),
    );

    if (!existingItem) {
      await dynamo.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            PK: `USER#${userId}`,
            SK: `JOB#${jobId}`,
            createdAt: now,
            deleted: false,
            durationSeconds,
            fileName: body.fileName,
            jobId,
            s3Key: body.s3Key,
            status: "PENDING",
            transcribeJobName,
            updatedAt: now,
            userId,
            wordCount: 0,
          },
          ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
        }),
      );
    } else {
      await dynamo.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            PK: `USER#${userId}`,
            SK: `JOB#${jobId}`,
          },
          UpdateExpression:
            "SET #status = :status, transcribeJobName = :transcribeJobName, updatedAt = :updatedAt, deleted = :deleted, failureReason = :failureReason, fileName = :fileName, durationSeconds = :durationSeconds",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":deleted": false,
            ":durationSeconds": durationSeconds,
            ":failureReason": "",
            ":fileName": body.fileName,
            ":status": "PENDING",
            ":transcribeJobName": transcribeJobName,
            ":updatedAt": now,
          },
        }),
      );
    }

    return jsonResponse(200, {
      jobId,
    });
  } catch (error) {
    console.error("transcribe failed", error);

    const message =
      error instanceof Error && error.message.includes("The media format provided does not match")
        ? "Audio format not supported."
        : error instanceof Error
          ? error.message
          : "Failed to start the transcription job.";

    return errorResponse(500, "TRANSCRIBE_START_ERROR", message);
  }
};
