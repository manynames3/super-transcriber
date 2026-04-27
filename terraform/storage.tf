resource "aws_s3_bucket" "uploads" {
  bucket        = local.upload_bucket_name
  force_destroy = var.environment != "prod"
  tags          = local.tags
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["Content-Type", "x-amz-acl", "x-amz-meta-*"]
    allowed_methods = ["PUT"]
    allowed_origins = [var.allowed_origin]
    max_age_seconds = 300
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "expire-upload-objects"
    status = "Enabled"

    filter {
      prefix = "uploads/"
    }

    expiration {
      days = 3
    }
  }
}

resource "aws_s3_bucket" "transcripts" {
  bucket        = local.transcript_bucket_name
  force_destroy = var.environment != "prod"
  tags          = local.tags
}

resource "aws_s3_bucket_public_access_block" "transcripts" {
  bucket                  = aws_s3_bucket.transcripts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "transcripts" {
  bucket = aws_s3_bucket.transcripts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "transcripts" {
  bucket = aws_s3_bucket.transcripts.id

  cors_rule {
    allowed_headers = ["Content-Type"]
    allowed_methods = ["GET"]
    allowed_origins = [var.allowed_origin]
    max_age_seconds = 300
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "transcripts" {
  bucket = aws_s3_bucket.transcripts.id

  rule {
    id     = "expire-transcript-objects"
    status = "Enabled"

    filter {
      prefix = "transcripts/"
    }

    expiration {
      days = 90
    }
  }
}
