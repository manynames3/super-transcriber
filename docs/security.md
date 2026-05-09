# Security and Privacy Notes

Super Transcriber is designed around explicit uploads, private AWS resources, and short-lived access paths. This document describes what the repo implements today and what it does not claim.

## Implemented Controls

| Area | Implementation |
|---|---|
| Authentication | Amazon Cognito User Pool with custom frontend login, registration, verification, and refresh-token flow |
| API authorization | API Gateway HTTP API validates Cognito JWTs before invoking protected Lambda routes |
| Browser token storage | Tokens are kept in Zustand memory only; no `localStorage`, `sessionStorage`, or cookies |
| File upload path | Browser requests a short-lived presigned S3 URL, then uploads directly to private S3 |
| S3 public access | Upload and transcript buckets block public access |
| S3 retention | Upload and transcript lifecycle expiration are Terraform variables, defaulting to 3 and 90 days |
| Job ownership | Lambda handlers validate Cognito `sub`, job ID format, and S3 key ownership |
| Job deletion | Delete is a soft-delete flag in DynamoDB; S3 lifecycle handles object cleanup |
| Audit visibility | Job detail responses include lifecycle events stored on the DynamoDB job item and exportable from the transcript UI |
| Usage limits | Lambda enforces monthly transcript count and max file duration by plan before starting Transcribe |
| Billing webhooks | Stripe webhook route verifies signed payloads before updating subscription status |

## Data Flow

1. The user authenticates with Cognito.
2. The browser validates the selected MP3 or M4A file before any upload.
3. The API returns a presigned S3 URL scoped to the authenticated user's upload key.
4. The browser uploads audio directly to S3.
5. Lambda starts an Amazon Transcribe async job against the S3 object.
6. The Transcribe Lambda reserves monthly usage for new jobs before the Transcribe job starts.
7. EventBridge invokes the completion Lambda when Transcribe finishes.
8. The completion Lambda stores raw transcript JSON in S3 and updates DynamoDB status.
9. The frontend polls job status and renders the formatted transcript.

## Private Deployment Boundary

In private-deployment mode, the deployer owns the AWS account resources: Cognito, S3, DynamoDB, Lambda, API Gateway, EventBridge, and Terraform state. This gives legal, HR, finance, and media teams a cleaner procurement story than sending files to a generic transcription website.

Amazon Transcribe still processes audio as part of the configured AWS workflow. The accurate claim is that no additional transcription SaaS needs to receive, store, or train on the uploaded audio.

## Explicit Non-Claims

This repository does not currently claim:

- HIPAA compliance
- SOC 2 compliance
- CJIS compliance
- end-to-end encryption controlled only by the customer
- complete air-gap isolation
- a formal legal hold or records-retention program
- human review or certified transcription accuracy
- PCI scope beyond redirecting users to Stripe Checkout

Those can become product directions, but they require policy, contracts, operational controls, and in some cases infrastructure changes beyond this repo.

## Practical Hardening Roadmap

- Add customer-managed KMS keys for S3 and DynamoDB where the added fixed key cost is acceptable.
- Expose configurable retention policies in an admin UI.
- Add admin-only audit exports.
- Add account-level team seats and role-based billing controls.
- Add optional private VPC endpoints only for customers willing to pay the added networking cost.
- Add a documented incident response and data deletion process.
