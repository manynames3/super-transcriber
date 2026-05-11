# Validation Evidence

This document is the proof checklist for demonstrating Super Transcriber as a working AWS cloud portfolio project. It intentionally separates implemented architecture from evidence artifacts so the README stays truthful and easy to scan.

## Current Evidence in the Repo

- README links to the live hosted frontends.
- `docs/architecture.md` includes the C4-style container diagram and runtime flow.
- Terraform files define Cognito, API Gateway HTTP API, Lambda, DynamoDB, S3, EventBridge, and lifecycle rules.
- GitHub Actions define automatic CI and manual frontend deployment workflows.
- Backstory screenshots show why a deterministic transcription pipeline was useful compared with general AI chat workflows:
  - `docs/images/backstory-chatgpt-m4a-tool-routing-failure.png`
  - `docs/images/backstory-claude-m4a-sandbox-failure.png`

## Evidence to Capture Before a Recruiter Review

Capture these screenshots or logs after deploying a clean environment. Do not include AWS account IDs, access keys, full ARNs that reveal account numbers, or secret values. Crop the AWS console top navigation/account menu if it appears.

| Evidence | What to capture | Why it matters |
|---|---|---|
| Cognito auth | Login/register flow and Cognito User Pool app client page with account header cropped | Proves custom auth and JWT-backed API design |
| API Gateway | HTTP API routes and JWT authorizer configuration with account header cropped | Proves authenticated serverless API routing |
| Presigned upload | Browser dashboard showing selected MP3/M4A, duration, and estimated cost | Proves client-side validation and cost-aware UX |
| S3 upload | Upload object under `uploads/{userId}/{jobId}/audio.{ext}` with account header cropped | Proves direct private S3 upload path |
| Transcribe job | Transcribe job detail page or CLI output showing async job status | Proves AWS Transcribe integration |
| EventBridge completion | EventBridge rule targeting the completion Lambda | Proves event-driven completion pipeline |
| Completion Lambda logs | CloudWatch logs showing completion handler read job state and updated transcript status | Proves async processing closed the loop |
| DynamoDB job item | Job record with `PK`, `SK`, `status`, `s3Key`, `transcribeJobName`, and `updatedAt` | Proves single-table job status tracking |
| Transcript storage | S3 transcript object under `transcripts/{userId}/{jobId}/transcript.json` | Proves raw transcript persistence |
| Transcript UI | Completed transcript page with copy/download controls | Proves end-user workflow is complete |
| Cloudflare Pages | Successful Pages deployment for `super-transcriber` or `super-transcriber-ent` | Proves static frontend deployment |
| CI | Passing `CI` workflow run | Proves reproducible build and IaC validation |

Phone numbers, user emails, sample audio filenames, and transcript text can be shown when they are intentionally part of a demo. AWS account numbers and secrets should not be shown.

## Useful Validation Commands

Run these from a deployed environment when preparing screenshots or a demo.

```bash
cd terraform
terraform output -raw api_base_url
terraform output -raw upload_bucket_name
terraform output -raw transcript_bucket_name
```

Check that the API responds to CORS preflight from the deployed frontend:

```bash
curl -i -X OPTIONS "$(terraform output -raw api_base_url)/upload-url" \
  -H "Origin: https://super-transcriber.pages.dev" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type"
```

Tail the Transcribe starter Lambda:

```bash
aws logs tail /aws/lambda/super-transcriber-dev-transcribe \
  --since 15m \
  --region "$(terraform output -raw aws_region)"
```

Tail the completion Lambda:

```bash
aws logs tail /aws/lambda/super-transcriber-dev-completion \
  --since 15m \
  --region "$(terraform output -raw aws_region)"
```

List recent Transcribe jobs:

```bash
aws transcribe list-transcription-jobs \
  --max-results 5 \
  --region "$(terraform output -raw aws_region)"
```

## What Not to Claim

- Do not claim enterprise usage unless there are real customers.
- Do not claim production traffic unless there are metrics.
- Do not claim AWS deploy is automatic from GitHub Actions unless the OIDC role and workflow are configured in that repo.
- Do not claim formal compliance such as HIPAA or SOC 2. The architecture is privacy-conscious, but certification requires process, controls, audits, and legal review.
