# ADR-005: Use a DynamoDB Single-Table Job Model with Soft Deletes and S3 Lifecycle Retention

## Status

Accepted

## Context

The application stores one main domain object: transcription jobs scoped to users. It needs low-cost reads and writes, job history pagination, lookup by Transcribe job name, and safe cleanup behavior without adding extra moving parts.

## Decision

Store user job records in a single DynamoDB table keyed by `PK = USER#{userId}` and `SK = JOB#{jobId}`, with a `TranscribeJobIndex` GSI on `transcribeJobName`. Mark jobs as deleted in DynamoDB instead of eagerly deleting S3 objects, and rely on S3 lifecycle rules to expire uploads after 3 days and transcripts after 90 days.

## Consequences

- Reads and writes stay simple and cheap for the current access patterns.
- EventBridge completion handling can look up the corresponding DynamoDB record efficiently through the GSI.
- Soft delete keeps the API behavior simple, but S3 cleanup becomes eventually consistent through lifecycle expiration rather than immediate deletion.
