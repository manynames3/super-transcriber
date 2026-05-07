# ADR-004: Use an Async Transcription Pipeline with EventBridge Completion Handling

## Status

Accepted

## Context

Transcription is a long-running operation that should not block an API request. The system needs to track progress, persist results, and recover cleanly if the frontend disconnects or polls slowly.

## Decision

Start Amazon Transcribe batch jobs asynchronously from Lambda, store job state in DynamoDB, and subscribe to `aws.transcribe` completion events with EventBridge. Use a completion Lambda to fetch the finished transcript JSON, store it in S3, and update the DynamoDB record with final status and word count.

## Consequences

- API requests stay short-lived and inexpensive.
- The system can expose consistent job state to the frontend through polling.
- Completion logic is isolated from the request path and can be retried independently by AWS if invocation fails.
