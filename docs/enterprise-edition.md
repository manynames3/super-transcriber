# Enterprise Edition Notes

## Thesis

The strongest v2 positioning for this project is not "another transcription website." It is a transcription workflow with a cleaner deployment boundary:

- start as a hosted subscription
- keep the product UI and workflow simple
- offer a private-deployment upgrade path for teams that want the stack inside their own AWS account
- publish the enterprise positioning separately at `https://super-transcriber-ent.pages.dev`

That makes the differentiator architectural, not cosmetic.

## What The Repo Already Supports

This codebase already contains the pieces that make the enterprise angle credible:

- custom Cognito auth instead of a social-login-only frontend
- private S3 buckets for uploads and transcript artifacts
- direct browser-to-S3 uploads with authenticated API initiation
- DynamoDB-backed job history instead of local-only state
- explicit S3 lifecycle retention for uploads and transcripts
- Terraform as the deployable infrastructure source of truth
- a React product surface that can sell hosted and private-deployment plans from the same frontend

In other words, the "private deployment" story is not imaginary. The stack is already deployable.

## Commercial Packaging

### 1. Hosted Workspace

Use for:

- individual users
- consultants
- recruiters evaluating product depth
- teams that want speed before procurement gets involved

Value proposition:

- fastest onboarding
- polished product UX
- predictable transcript workflow

Charging model:

- monthly subscription

### 2. Pro Team Workspace

Use for:

- recurring internal users
- research teams
- media teams
- ops teams that need transcript history and export reliability

Value proposition:

- more usage
- better support
- stronger "real product" posture than an ad hoc internal tool

Charging model:

- higher monthly subscription

### 3. Private Deployment

Use for:

- legal teams
- HR and people operations
- internal strategy / finance
- studios with IP-sensitive media

Value proposition:

- customer-owned AWS account
- customer-owned Cognito, S3, and DynamoDB resources
- clearer procurement and data-boundary story than a generic transcription SaaS

Charging model:

- setup fee plus support retainer
- or annual license plus implementation support

## Why This Angle Stands Out

Most public transcription sites compete on:

- AI summaries
- chat assistants
- integrations
- meeting bots

This project can stand out on:

- explicit upload workflow instead of silent meeting capture
- defined storage and retention path
- deployable customer-owned AWS infrastructure
- a migration path from hosted SaaS to private deployment

That is a better recruiter story and a more defensible enterprise story.

## Messaging Guardrails

Use precise claims:

- "Audio and transcripts live in AWS infrastructure backing the product."
- "Private deployment can place the stack inside a customer-owned AWS account."
- "The workflow is explicit upload, not a meeting bot joining calls."
- "Retention is implemented with S3 lifecycle rules."

Avoid unsupported claims:

- do not claim HIPAA, CJIS, SOC 2, or similar certifications for this repo
- do not claim full air-gap or VPC isolation unless the deployment actually implements it
- do not claim a zero-vendor-processing story while Amazon Transcribe is still part of the stack

## Practical Next Steps

If this project evolves further, the highest-leverage enterprise additions would be:

1. Customer-managed KMS support for buckets and DynamoDB.
2. Admin controls and audit-friendly job activity surfaces.
3. Configurable retention policies instead of fixed 3-day and 90-day defaults.
4. A private-deployment onboarding flow and sales CTA.
5. Stripe or contract-backed billing to make the subscription ladder real instead of presentational.
