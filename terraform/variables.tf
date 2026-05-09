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
