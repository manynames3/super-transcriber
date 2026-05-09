provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  allowed_cors_origins  = distinct(concat([var.allowed_origin], var.allowed_origins))
  lambda_artifact_root  = "${path.module}/.artifacts"
  resource_prefix       = "${var.project_name}-${var.environment}"
  transcript_bucket_arn = "${aws_s3_bucket.transcripts.arn}/transcripts/*"
  transcript_bucket_name = coalesce(
    var.transcript_bucket_name,
    lower("${local.resource_prefix}-${data.aws_caller_identity.current.account_id}-${var.aws_region}-transcripts"),
  )
  upload_bucket_arn = "${aws_s3_bucket.uploads.arn}/uploads/*"
  upload_bucket_name = coalesce(
    var.upload_bucket_name,
    lower("${local.resource_prefix}-${data.aws_caller_identity.current.account_id}-${var.aws_region}-uploads"),
  )
  tags = {
    Application = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
