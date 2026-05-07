# Super Transcriber

Super Transcriber is a cost-first transcription web app that lets authenticated users upload MP3s, send them through Amazon Transcribe, and review or export speaker-labeled transcripts from a polished React dashboard. The repository demonstrates a full-stack serverless build: custom Cognito auth, direct browser-to-S3 uploads, a Lambda + DynamoDB API, an EventBridge-driven completion pipeline, Terraform-managed AWS infrastructure, and Cloudflare Pages frontend hosting.

- **Live demo:** [super-transcriber.pages.dev](https://super-transcriber.pages.dev)
- **Architecture docs:** [docs/architecture.md](docs/architecture.md)
- **ADRs:** [docs/adrs/README.md](docs/adrs/README.md)

## About

- Built as a personal-scale SaaS-style product rather than a toy demo: landing page, auth, dashboard, job history, transcript viewer, and deployment workflows are all included.
- Uses a custom Cognito login, registration, and email verification flow instead of Cognito Hosted UI.
- Keeps cloud cost constraints explicit in the architecture: HTTP API over REST, Lambda on `arm64`, DynamoDB on-demand, S3 lifecycle cleanup, and no VPC or NAT.
- Shows practical client and backend engineering details such as MP3 header validation, duration-based cost preview, retryable polling, presigned uploads, and soft-delete job history.

## Tech Stack

| Area | Technologies |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn-style UI, Zustand |
| Auth | Amazon Cognito User Pool, custom forms, JWT auth, refresh-token retry flow |
| API | API Gateway HTTP API, Lambda proxy integrations |
| Compute | AWS Lambda (Node.js 20, `arm64`) |
| Storage | Amazon S3, DynamoDB single-table design |
| Transcription | Amazon Transcribe async jobs with speaker diarization |
| Eventing | Amazon EventBridge |
| Infrastructure | Terraform for deployable infrastructure, CDK TypeScript used for Lambda source and bundling |
| Hosting | Cloudflare Pages |
| CI/CD | GitHub Actions, Cloudflare Wrangler, optional AWS OIDC workflow |

## Engineering Highlights

- Direct-to-S3 upload path: the browser requests a presigned `PUT` URL, uploads the MP3 directly with progress reporting, then starts transcription without proxying file bytes through Lambda.
- Event-driven completion pipeline: Amazon Transcribe emits completion events, EventBridge triggers a completion Lambda, the Lambda stores the raw transcript JSON in S3, and DynamoDB is updated with final status and word count.
- Custom auth without persistent browser token storage: access, ID, and refresh tokens live only in Zustand memory, and the fetch wrapper retries exactly once after a `401` by refreshing the session through Cognito.
- Cost-aware UX: the client validates the `.mp3` extension and header bytes, enforces a 200 MB limit, extracts duration with the Web Audio API, and estimates variable Amazon Transcribe cost before submission.
- Transcript-focused product UX: polling uses exponential backoff, diarized text is reformatted into speaker sections, large transcripts paginate into 2,500-word chunks, and users can copy or download `.txt` and raw `.json` output.

## Architecture

The system is split between a static frontend on Cloudflare Pages and a serverless AWS backend. Terraform is the deployable infrastructure source of truth. Lambda handler source lives in `cdk/lambda/`, and an esbuild bundling script writes deployable artifacts into `terraform/dist/` for Terraform packaging.

- High-level architecture: [docs/architecture.md](docs/architecture.md)
- Architectural decisions: [docs/adrs/README.md](docs/adrs/README.md)

## Cost Profile

| Service | Pricing model | Notes |
|---|---|---|
| Cloudflare Pages | Free tier | SPA hosting |
| Cognito User Pools | Permanent free tier | No hosted UI used |
| Lambda | Per request and GB-second | All functions run on `arm64` |
| API Gateway HTTP API | Per request | Cheaper than REST API |
| DynamoDB | `PAY_PER_REQUEST` | No provisioned capacity |
| S3 | Storage + requests | Lifecycle rules minimize retained data |
| EventBridge | Per event | Negligible at this scale |
| Amazon Transcribe | $0.024/min after free tier | Main variable cost driver |

## Repository Layout

```text
docs/       Architecture notes and ADRs
terraform/  Terraform infrastructure, backend config examples, and packaged artifacts
cdk/        Lambda TypeScript sources and bundling toolchain
frontend/   React 18 + Vite single-page app
.github/    GitHub Actions workflows
```

## Limitations

- MP3-only input in the current product flow.
- Speaker diarization is currently fixed to two speakers in the UI and transcription request path.
- The app is intentionally tuned for low traffic: active jobs are capped at 5 per user and job listing pagination is capped at 20 per request.
- The deployed AWS account must have Amazon Transcribe enabled; some accounts may require separate service activation before jobs can run.

## Prerequisites

- AWS account with access to Cognito, Lambda, API Gateway HTTP API, S3, DynamoDB, EventBridge, and Amazon Transcribe
- Terraform 1.14+
- Node.js 20+
- npm 10+
- Cloudflare Pages project
- Optional: GitHub Actions OIDC role if you want to re-enable automated AWS deploys

## First-Time Setup

1. Install dependencies:

```bash
cd cdk && npm ci
cd ../frontend && npm ci
```

2. Copy `terraform/terraform.tfvars.example` to `terraform/terraform.tfvars` and set `allowed_origin` to your Cloudflare Pages URL.

3. Bundle Lambda artifacts:

```bash
cd cdk
npm run build:lambdas
```

## Terraform State Backend

For local-only testing you can use `terraform init -backend=false`. For repeatable deploys and GitHub Actions, use an S3 backend plus a DynamoDB lock table.

One-time backend bootstrap example:

```bash
aws s3api create-bucket --bucket your-terraform-state-bucket --region us-east-1
aws s3api put-bucket-versioning --bucket your-terraform-state-bucket --versioning-configuration Status=Enabled
aws dynamodb create-table \
  --table-name your-terraform-lock-table \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

Then copy `terraform/backend.hcl.example` to `terraform/backend.hcl` and fill in your state bucket, key, and lock table.

## Deploy AWS with Terraform

```bash
cd terraform
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```

Useful outputs:

```bash
terraform output -raw api_base_url
terraform output -raw cognito_user_pool_id
terraform output -raw cognito_client_id
terraform output -raw aws_region
```

## Frontend Setup

Copy `frontend/.env.example` to `frontend/.env` and fill it from Terraform outputs:

```env
VITE_API_BASE_URL=...
VITE_COGNITO_USER_POOL_ID=...
VITE_COGNITO_CLIENT_ID=...
VITE_AWS_REGION=us-east-1
```

Local frontend development:

```bash
cd frontend
npm run dev
```

## Deployment Model

- Infrastructure is deployed from `terraform/`.
- Lambda source is written in `cdk/lambda/` and bundled into `terraform/dist/` by `cdk/scripts/build-lambdas.mjs`.
- The frontend is built with Vite and deployed to Cloudflare Pages.
- The checked-in AWS GitHub Actions workflow is currently stored as `.github/workflows/deploy-aws.disabled.yml`. Rename it back to `.github/workflows/deploy-aws.yml` after configuring the OIDC role and repo variables if you want automated AWS deploys.

## GitHub Actions

### AWS deploy workflow

Template file: `.github/workflows/deploy-aws.disabled.yml`

Required secret:

- `AWS_GITHUB_ACTIONS_ROLE_ARN`

Required repository variables:

- `TF_ALLOWED_ORIGIN`
- `TF_STATE_BUCKET`
- `TF_STATE_KEY`
- `TF_STATE_REGION`
- `TF_STATE_LOCK_TABLE`

Optional repository variables:

- `TF_AWS_REGION` default: `us-east-1`
- `TF_ENVIRONMENT`
- `TF_PROJECT_NAME`

### Frontend deploy workflow

File: `.github/workflows/deploy-frontend.yml`

Required secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Required repository variables:

- `VITE_API_BASE_URL`
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_AWS_REGION`

## Privacy and Security Notes

- No Lambda runs in a VPC.
- S3 buckets block all public access.
- Client uploads use presigned URLs only.
- API Gateway only allows the configured Pages origin.
- Access, ID, and refresh tokens stay in Zustand memory only.
- JWT validation is handled by the HTTP API Cognito authorizer.
- Upload objects expire after 3 days and transcript JSON expires after 90 days.

## Operational Notes

- Active jobs are capped at 5 per user.
- Polling starts at 3 seconds, backs off to 30 seconds, and stops after 15 minutes.
- DynamoDB records are soft-deleted, while S3 cleanup is handled by lifecycle rules rather than eager object deletion.

## Troubleshooting

### Upload fails with `Failed to fetch`

If the dashboard upload button shows `Failed to fetch`, the browser usually failed on the API Gateway preflight request before the app received a JSON error body.

Checks:

- Confirm `TF_ALLOWED_ORIGIN` exactly matches the deployed frontend origin, for example `https://super-transcriber.pages.dev`
- Re-run `terraform apply` after changing API Gateway or CORS settings
- Verify the API preflight succeeds:

```bash
curl -i -X OPTIONS 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/upload-url' \
  -H 'Origin: https://super-transcriber.pages.dev' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization,content-type'
```

Expected result:

- `HTTP/2 204`

If you see `429 Too Many Requests`, check the API Gateway stage throttling configuration. This project expects non-zero default stage throttling values so CORS preflight requests are not rejected before upload.

### `Missing Cognito configuration`

The frontend throws this when the Vite build does not have all required Cognito variables.

Required values:

- `VITE_AWS_REGION`
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`

For local development:

- create `frontend/.env`
- populate it from Terraform outputs

```bash
cd terraform
printf "VITE_API_BASE_URL=%s\n" "$(terraform output -raw api_base_url)"
printf "VITE_COGNITO_USER_POOL_ID=%s\n" "$(terraform output -raw cognito_user_pool_id)"
printf "VITE_COGNITO_CLIENT_ID=%s\n" "$(terraform output -raw cognito_client_id)"
printf "VITE_AWS_REGION=%s\n" "$(terraform output -raw aws_region)"
```

For Cloudflare Pages via GitHub Actions:

- add the same values under `Settings -> Secrets and variables -> Actions -> Variables`
- re-run `Deploy Frontend` after adding or changing them
- hard refresh the deployed site after the new frontend bundle is published
