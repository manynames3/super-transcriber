# Private Deployment Guide

Private deployment is the enterprise packaging path for Super Transcriber. Instead of sending sensitive audio to a generic transcription SaaS, a customer can deploy the same serverless stack into an AWS account they control.

This is not a claim that the system is air-gapped or compliance-certified. Amazon Transcribe still processes the audio. The value is a clearer ownership boundary: the Cognito user pool, S3 buckets, DynamoDB table, Lambda functions, API Gateway, and EventBridge rule are created in the deployer's AWS account.

## What Gets Deployed

- Cognito User Pool and app client for custom login, registration, and token refresh.
- API Gateway HTTP API with Cognito JWT authorization.
- Lambda handlers for upload URL creation, Transcribe job start, job polling, job listing, soft-delete, and completion handling.
- Private S3 upload and transcript buckets with public access blocked.
- DynamoDB single-table job store with on-demand billing.
- EventBridge rule for Amazon Transcribe completion events.
- S3 lifecycle rules that expire uploads after 3 days and transcript JSON after 90 days by default.
- Optional Stripe Checkout and webhook Lambdas for hosted subscription billing.
- Public enterprise lead-capture route that stores private-deployment inquiries in DynamoDB.

## Customer-Owned Data Boundary

| Data | Location |
|---|---|
| User identity | Customer AWS Cognito User Pool |
| Uploaded audio | Customer AWS S3 upload bucket |
| Transcribe job metadata | Customer AWS DynamoDB table |
| Raw transcript JSON | Customer AWS S3 transcript bucket |
| Transcript status events | Customer AWS DynamoDB job item audit trail |
| Subscription and usage state | Customer AWS DynamoDB billing and usage items |
| Enterprise inquiries | Customer AWS DynamoDB lead items |

The hosted frontend can point at this private backend by setting the Vite environment variables to the customer's API Gateway and Cognito outputs.

## Deployment Steps

1. Install local prerequisites: Node.js 20, npm 10, Terraform 1.14+, AWS CLI, and configured AWS credentials for the target account.

2. Install dependencies and bundle Lambda artifacts:

```bash
cd cdk
npm ci
npm run build:lambdas
```

3. Create a Terraform variables file:

```bash
cd ../terraform
cp terraform.tfvars.example terraform.tfvars
```

4. Set the required values in `terraform.tfvars`:

```hcl
aws_region      = "us-east-1"
environment     = "prod"
project_name    = "super-transcriber"
allowed_origin  = "https://your-pages-domain.pages.dev"
allowed_origins = ["https://your-enterprise-pages-domain.pages.dev"]

upload_retention_days     = 3
transcript_retention_days = 90
```

5. Initialize Terraform. Use the S3 backend for repeatable environments, or `-backend=false` for a local throwaway deployment:

```bash
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```

6. Capture the frontend configuration from Terraform outputs:

```bash
terraform output -raw api_base_url
terraform output -raw cognito_user_pool_id
terraform output -raw cognito_client_id
terraform output -raw aws_region
```

7. Add those values to the Cloudflare Pages project as build variables:

```text
VITE_API_BASE_URL
VITE_COGNITO_USER_POOL_ID
VITE_COGNITO_CLIENT_ID
VITE_AWS_REGION
```

8. Redeploy the frontend so Vite bakes the variables into the static bundle.

## Optional Hosted Billing

Stripe is optional. If the Stripe variables are blank, free-plan enforcement remains active and checkout returns a configuration error instead of failing silently.

```hcl
app_base_url          = "https://your-enterprise-pages-domain.pages.dev"
stripe_pro_price_id   = "price_..."
stripe_secret_key     = "sk_..."
stripe_webhook_secret = "whsec_..."
```

Configure the Stripe webhook endpoint to:

```text
https://your-api-id.execute-api.us-east-1.amazonaws.com/billing/stripe-webhook
```

The webhook updates the DynamoDB billing item for:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Enterprise Defaults

The current defaults are intentionally simple and low-cost:

- No NAT Gateway, VPC Lambda, RDS, Redis, CloudFront, or WAF.
- DynamoDB uses on-demand billing.
- API Gateway uses HTTP API instead of REST API.
- Lambda runs on `arm64`.
- Audio uploads go directly to S3 with presigned URLs instead of through Lambda.
- Starter and Pro plan limits are enforced in Lambda before Amazon Transcribe starts.
- Stripe and lead capture reuse Lambda and DynamoDB; there is no additional fixed-cost database or CRM service.

## Operational Notes

- The AWS account must have Amazon Transcribe enabled in the selected region.
- CORS must include every frontend domain that will call the API or upload to S3.
- Terraform deploys backend infrastructure; Cloudflare Pages deploys the frontend.
- Audit events are stored on the DynamoDB job item and returned with job detail responses.
- Soft delete hides the job in the app; S3 lifecycle rules handle object expiration.

## Teardown

For a non-production environment, run:

```bash
cd terraform
terraform destroy
```

If S3 buckets contain objects, empty them first or Terraform will fail to delete the buckets.
