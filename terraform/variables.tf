variable "allowed_origin" {
  description = "Cloudflare Pages origin allowed for API Gateway and S3 CORS."
  type        = string

  validation {
    condition     = can(regex("^https://", var.allowed_origin))
    error_message = "allowed_origin must be an https origin."
  }
}

variable "allowed_origins" {
  description = "Additional HTTPS origins allowed for API Gateway and S3 CORS."
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for origin in var.allowed_origins : can(regex("^https://", origin))])
    error_message = "allowed_origins values must be https origins."
  }
}

variable "aws_region" {
  description = "AWS region for the stack."
  type        = string
  default     = "us-east-1"
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name."
  type        = string
  default     = "super-transcriber"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name prefix for named resources."
  type        = string
  default     = "super-transcriber"
}

variable "app_base_url" {
  description = "Public frontend base URL used for Stripe Checkout success and cancel redirects."
  type        = string
  default     = "https://super-transcriber-ent.pages.dev"
}

variable "stripe_pro_price_id" {
  description = "Stripe recurring Price ID for the hosted Pro subscription."
  type        = string
  default     = ""
}

variable "stripe_secret_key" {
  description = "Stripe secret key used by the checkout Lambda. Leave empty to disable self-serve checkout."
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook endpoint signing secret. Leave empty to disable webhook processing."
  type        = string
  default     = ""
  sensitive   = true
}

variable "upload_retention_days" {
  description = "Number of days before uploaded source audio expires."
  type        = number
  default     = 3
}

variable "transcript_retention_days" {
  description = "Number of days before transcript JSON artifacts expire."
  type        = number
  default     = 90
}

variable "transcript_bucket_name" {
  description = "Optional override for the transcript bucket name."
  type        = string
  default     = null
}

variable "upload_bucket_name" {
  description = "Optional override for the upload bucket name."
  type        = string
  default     = null
}
