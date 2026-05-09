import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  GetTranscriptionJobCommand,
  TranscribeClient,
} from "@aws-sdk/client-transcribe";
import type { EventBridgeEvent } from "aws-lambda";
import { createAuditEvent, formatTranscript } from "../shared";

interface TranscribeEventDetail {
  FailureReason?: string;
  TranscriptionJobName: string;
  TranscriptionJobStatus: "COMPLETED" | "FAILED";
}

interface JobRecord {
  PK: string;
  SK: string;
  jobId: string;
  userId: string;
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const transcribe = new TranscribeClient({});
const tableName = process.env.DYNAMODB_TABLE_NAME;
const transcriptBucketName = process.env.TRANSCRIPT_BUCKET_NAME;

export const handler = async (
  event: EventBridgeEvent<"Transcribe Job State Change", TranscribeEventDetail>,
) => {
  if (!tableName || !transcriptBucketName) {
    throw new Error("Server configuration is incomplete.");
  }

  const transcribeJobName = event.detail.TranscriptionJobName;
  const lookup = await dynamo.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "TranscribeJobIndex",
      KeyConditionExpression: "transcribeJobName = :transcribeJobName",
      ExpressionAttributeValues: {
        ":transcribeJobName": transcribeJobName,
      },
      Limit: 1,
    }),
  );

  const job = lookup.Items?.[0] as JobRecord | undefined;
  if (!job) {
    console.warn("No matching job found for transcribe completion", { transcribeJobName });
    return;
  }

  const now = new Date().toISOString();

  if (event.detail.TranscriptionJobStatus === "FAILED") {
    const failureReason = event.detail.FailureReason ?? "Transcription failed.";
    await dynamo.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: job.PK,
          SK: job.SK,
        },
        UpdateExpression:
          "SET #status = :status, failureReason = :failureReason, updatedAt = :updatedAt, auditTrail = list_append(if_not_exists(auditTrail, :emptyAuditTrail), :auditTrail)",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":auditTrail": [
            createAuditEvent(
              "TRANSCRIBE_FAILED",
              `Amazon Transcribe marked the job failed: ${failureReason}`,
              "SYSTEM",
              now,
            ),
          ],
          ":emptyAuditTrail": [],
          ":failureReason": failureReason,
          ":status": "FAILED",
          ":updatedAt": now,
        },
      }),
    );
    return;
  }

  const transcriptionJob = await transcribe.send(
    new GetTranscriptionJobCommand({
      TranscriptionJobName: transcribeJobName,
    }),
  );

  const transcriptUri = transcriptionJob.TranscriptionJob?.Transcript?.TranscriptFileUri;
  if (!transcriptUri) {
    throw new Error(`Transcript URI missing for job ${transcribeJobName}.`);
  }

  const transcriptResponse = await fetch(transcriptUri);
  if (!transcriptResponse.ok) {
    throw new Error(`Failed to download transcript JSON (${transcriptResponse.status}).`);
  }

  const transcriptJson = (await transcriptResponse.json()) as unknown;
  const { wordCount } = formatTranscript(transcriptJson);
  const transcriptKey = `transcripts/${job.userId}/${job.jobId}/transcript.json`;

  await s3.send(
    new PutObjectCommand({
      Body: JSON.stringify(transcriptJson),
      Bucket: transcriptBucketName,
      ContentType: "application/json",
      Key: transcriptKey,
    }),
  );

  await dynamo.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: job.PK,
        SK: job.SK,
      },
      UpdateExpression:
        "SET #status = :status, wordCount = :wordCount, updatedAt = :updatedAt, failureReason = :failureReason, auditTrail = list_append(if_not_exists(auditTrail, :emptyAuditTrail), :auditTrail)",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":auditTrail": [
          createAuditEvent(
            "TRANSCRIBE_COMPLETED",
            `Transcript JSON stored at transcripts/${job.userId}/${job.jobId}/transcript.json with ${wordCount} words.`,
            "SYSTEM",
            now,
          ),
        ],
        ":emptyAuditTrail": [],
        ":failureReason": "",
        ":status": "COMPLETED",
        ":updatedAt": now,
        ":wordCount": wordCount,
      },
    }),
  );
};
