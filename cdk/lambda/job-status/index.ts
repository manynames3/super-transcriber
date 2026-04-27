import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  DynamoDBDocumentClient,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  GetTranscriptionJobCommand,
  TranscribeClient,
} from "@aws-sdk/client-transcribe";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  errorResponse,
  formatTranscript,
  getUserId,
  isValidJobId,
  jsonResponse,
} from "../shared";

interface JobRecord {
  createdAt: string;
  deleted?: boolean;
  durationSeconds?: number;
  failureReason?: string;
  fileName: string;
  jobId: string;
  s3Key: string;
  status: string;
  transcribeJobName: string;
  updatedAt: string;
  userId: string;
  wordCount?: number;
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const transcribe = new TranscribeClient({});
const tableName = process.env.DYNAMODB_TABLE_NAME;
const transcriptBucketName = process.env.TRANSCRIPT_BUCKET_NAME;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!tableName || !transcriptBucketName) {
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

    const result = await dynamo.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `JOB#${jobId}`,
        },
      }),
    );

    const job = result.Item as JobRecord | undefined;
    if (!job || job.deleted) {
      return errorResponse(404, "JOB_NOT_FOUND", "Transcription job not found.");
    }

    let liveStatus = job.status;
    let liveFailureReason = job.failureReason ?? "";

    if (job.status === "PENDING" || job.status === "IN_PROGRESS") {
      const liveJob = await transcribe.send(
        new GetTranscriptionJobCommand({
          TranscriptionJobName: job.transcribeJobName,
        }),
      );

      liveStatus = liveJob.TranscriptionJob?.TranscriptionJobStatus ?? job.status;
      liveFailureReason = liveJob.TranscriptionJob?.FailureReason ?? liveFailureReason;
    }

    const responseJob = {
      createdAt: job.createdAt,
      durationSeconds: job.durationSeconds ?? 0,
      failureReason: liveFailureReason,
      fileName: job.fileName,
      jobId: job.jobId,
      s3Key: job.s3Key,
      status: liveStatus,
      updatedAt: job.updatedAt,
      wordCount: job.wordCount ?? 0,
    };

    if (liveStatus !== "COMPLETED") {
      return jsonResponse(200, responseJob);
    }

    const transcriptKey = `transcripts/${userId}/${jobId}/transcript.json`;
    let transcriptObject;
    try {
      transcriptObject = await s3.send(
        new GetObjectCommand({
          Bucket: transcriptBucketName,
          Key: transcriptKey,
        }),
      );
    } catch (error) {
      if ((error as { name?: string }).name === "NoSuchKey") {
        return jsonResponse(200, {
          ...responseJob,
          status: "IN_PROGRESS",
        });
      }
      throw error;
    }

    const transcriptJson = JSON.parse(await transcriptObject.Body!.transformToString()) as unknown;
    const formattedTranscript = formatTranscript(transcriptJson);

    return jsonResponse(200, {
      ...responseJob,
      rawTranscript: transcriptJson,
      transcriptText: formattedTranscript.text,
      wordCount: formattedTranscript.wordCount,
    });
  } catch (error) {
    console.error("job-status failed", error);
    return errorResponse(500, "JOB_STATUS_ERROR", "Failed to fetch the transcription job.");
  }
};
