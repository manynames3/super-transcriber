# ADR-001: Use a Cost-First Serverless AWS Backend with a Static Frontend

## Status

Accepted

## Context

The project is a personal-scale transcription product with a hard requirement for near-zero fixed monthly cost. The system still needs identity, uploads, async processing, transcript storage, and an authenticated web UI.

## Decision

Use Cloudflare Pages for the static frontend and managed AWS serverless services for the backend: Cognito, API Gateway HTTP API, Lambda, DynamoDB, S3, Amazon Transcribe, and EventBridge. Keep Lambda functions outside a VPC and use `arm64` for lower cost.

## Consequences

- The system has almost no fixed infrastructure cost at low volume.
- The operational model stays simple because there are no servers, databases to patch, or network appliances such as NAT Gateways.
- The architecture depends on the behavior and quotas of managed services, especially Amazon Transcribe.
