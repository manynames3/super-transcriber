data "archive_file" "upload_url" {
  type        = "zip"
  source_dir  = "${path.module}/dist/upload-url"
  output_path = "${local.lambda_artifact_root}/upload-url.zip"
}

data "archive_file" "transcribe" {
  type        = "zip"
  source_dir  = "${path.module}/dist/transcribe"
  output_path = "${local.lambda_artifact_root}/transcribe.zip"
}

data "archive_file" "job_status" {
  type        = "zip"
  source_dir  = "${path.module}/dist/job-status"
  output_path = "${local.lambda_artifact_root}/job-status.zip"
}

data "archive_file" "jobs_list" {
  type        = "zip"
  source_dir  = "${path.module}/dist/jobs-list"
  output_path = "${local.lambda_artifact_root}/jobs-list.zip"
}

data "archive_file" "job_delete" {
  type        = "zip"
  source_dir  = "${path.module}/dist/job-delete"
  output_path = "${local.lambda_artifact_root}/job-delete.zip"
}

data "archive_file" "completion" {
  type        = "zip"
  source_dir  = "${path.module}/dist/completion"
  output_path = "${local.lambda_artifact_root}/completion.zip"
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      identifiers = ["lambda.amazonaws.com"]
      type        = "Service"
    }
  }
}

resource "aws_iam_role" "upload_url" {
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  name               = "${local.resource_prefix}-upload-url-role"
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "upload_url_basic" {
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.upload_url.name
}

data "aws_iam_policy_document" "upload_url" {
  statement {
    actions   = ["dynamodb:Query"]
    resources = [aws_dynamodb_table.jobs.arn]
  }

  statement {
    actions   = ["s3:PutObject"]
    resources = [local.upload_bucket_arn]
  }
}

resource "aws_iam_role_policy" "upload_url" {
  name   = "${local.resource_prefix}-upload-url-policy"
  policy = data.aws_iam_policy_document.upload_url.json
  role   = aws_iam_role.upload_url.id
}

resource "aws_lambda_function" "upload_url" {
  architectures    = ["arm64"]
  filename         = data.archive_file.upload_url.output_path
  function_name    = "${local.resource_prefix}-upload-url"
  handler          = "index.handler"
  memory_size      = 512
  role             = aws_iam_role.upload_url.arn
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.upload_url.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      COGNITO_USER_POOL_ID   = aws_cognito_user_pool.main.id
      DYNAMODB_TABLE_NAME    = aws_dynamodb_table.jobs.name
      TRANSCRIPT_BUCKET_NAME = aws_s3_bucket.transcripts.bucket
      UPLOAD_BUCKET_NAME     = aws_s3_bucket.uploads.bucket
    }
  }

  tags = local.tags
}

resource "aws_iam_role" "transcribe" {
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  name               = "${local.resource_prefix}-transcribe-role"
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "transcribe_basic" {
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.transcribe.name
}

data "aws_iam_policy_document" "transcribe" {
  statement {
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
    ]
    resources = [aws_dynamodb_table.jobs.arn]
  }

  statement {
    actions   = ["transcribe:StartTranscriptionJob"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "transcribe" {
  name   = "${local.resource_prefix}-transcribe-policy"
  policy = data.aws_iam_policy_document.transcribe.json
  role   = aws_iam_role.transcribe.id
}

resource "aws_lambda_function" "transcribe" {
  architectures    = ["arm64"]
  filename         = data.archive_file.transcribe.output_path
  function_name    = "${local.resource_prefix}-transcribe"
  handler          = "index.handler"
  memory_size      = 512
  role             = aws_iam_role.transcribe.arn
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.transcribe.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      COGNITO_USER_POOL_ID   = aws_cognito_user_pool.main.id
      DYNAMODB_TABLE_NAME    = aws_dynamodb_table.jobs.name
      TRANSCRIPT_BUCKET_NAME = aws_s3_bucket.transcripts.bucket
      UPLOAD_BUCKET_NAME     = aws_s3_bucket.uploads.bucket
    }
  }

  tags = local.tags
}

resource "aws_iam_role" "job_status" {
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  name               = "${local.resource_prefix}-job-status-role"
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "job_status_basic" {
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.job_status.name
}

data "aws_iam_policy_document" "job_status" {
  statement {
    actions   = ["dynamodb:GetItem"]
    resources = [aws_dynamodb_table.jobs.arn]
  }

  statement {
    actions   = ["s3:GetObject"]
    resources = [local.transcript_bucket_arn]
  }

  statement {
    actions   = ["transcribe:GetTranscriptionJob"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "job_status" {
  name   = "${local.resource_prefix}-job-status-policy"
  policy = data.aws_iam_policy_document.job_status.json
  role   = aws_iam_role.job_status.id
}

resource "aws_lambda_function" "job_status" {
  architectures    = ["arm64"]
  filename         = data.archive_file.job_status.output_path
  function_name    = "${local.resource_prefix}-job-status"
  handler          = "index.handler"
  memory_size      = 512
  role             = aws_iam_role.job_status.arn
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.job_status.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      COGNITO_USER_POOL_ID   = aws_cognito_user_pool.main.id
      DYNAMODB_TABLE_NAME    = aws_dynamodb_table.jobs.name
      TRANSCRIPT_BUCKET_NAME = aws_s3_bucket.transcripts.bucket
      UPLOAD_BUCKET_NAME     = aws_s3_bucket.uploads.bucket
    }
  }

  tags = local.tags
}

resource "aws_iam_role" "jobs_list" {
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  name               = "${local.resource_prefix}-jobs-list-role"
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "jobs_list_basic" {
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.jobs_list.name
}

data "aws_iam_policy_document" "jobs_list" {
  statement {
    actions   = ["dynamodb:Query"]
    resources = [aws_dynamodb_table.jobs.arn]
  }
}

resource "aws_iam_role_policy" "jobs_list" {
  name   = "${local.resource_prefix}-jobs-list-policy"
  policy = data.aws_iam_policy_document.jobs_list.json
  role   = aws_iam_role.jobs_list.id
}

resource "aws_lambda_function" "jobs_list" {
  architectures    = ["arm64"]
  filename         = data.archive_file.jobs_list.output_path
  function_name    = "${local.resource_prefix}-jobs-list"
  handler          = "index.handler"
  memory_size      = 512
  role             = aws_iam_role.jobs_list.arn
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.jobs_list.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      COGNITO_USER_POOL_ID   = aws_cognito_user_pool.main.id
      DYNAMODB_TABLE_NAME    = aws_dynamodb_table.jobs.name
      TRANSCRIPT_BUCKET_NAME = aws_s3_bucket.transcripts.bucket
      UPLOAD_BUCKET_NAME     = aws_s3_bucket.uploads.bucket
    }
  }

  tags = local.tags
}

resource "aws_iam_role" "job_delete" {
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  name               = "${local.resource_prefix}-job-delete-role"
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "job_delete_basic" {
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.job_delete.name
}

data "aws_iam_policy_document" "job_delete" {
  statement {
    actions   = ["dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.jobs.arn]
  }
}

resource "aws_iam_role_policy" "job_delete" {
  name   = "${local.resource_prefix}-job-delete-policy"
  policy = data.aws_iam_policy_document.job_delete.json
  role   = aws_iam_role.job_delete.id
}

resource "aws_lambda_function" "job_delete" {
  architectures    = ["arm64"]
  filename         = data.archive_file.job_delete.output_path
  function_name    = "${local.resource_prefix}-job-delete"
  handler          = "index.handler"
  memory_size      = 512
  role             = aws_iam_role.job_delete.arn
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.job_delete.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      COGNITO_USER_POOL_ID   = aws_cognito_user_pool.main.id
      DYNAMODB_TABLE_NAME    = aws_dynamodb_table.jobs.name
      TRANSCRIPT_BUCKET_NAME = aws_s3_bucket.transcripts.bucket
      UPLOAD_BUCKET_NAME     = aws_s3_bucket.uploads.bucket
    }
  }

  tags = local.tags
}

resource "aws_iam_role" "completion" {
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  name               = "${local.resource_prefix}-completion-role"
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "completion_basic" {
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.completion.name
}

data "aws_iam_policy_document" "completion" {
  statement {
    actions = ["dynamodb:Query"]
    resources = [
      aws_dynamodb_table.jobs.arn,
      "${aws_dynamodb_table.jobs.arn}/index/TranscribeJobIndex",
    ]
  }

  statement {
    actions   = ["dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.jobs.arn]
  }

  statement {
    actions   = ["s3:PutObject"]
    resources = [local.transcript_bucket_arn]
  }

  statement {
    actions   = ["transcribe:GetTranscriptionJob"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "completion" {
  name   = "${local.resource_prefix}-completion-policy"
  policy = data.aws_iam_policy_document.completion.json
  role   = aws_iam_role.completion.id
}

resource "aws_lambda_function" "completion" {
  architectures    = ["arm64"]
  filename         = data.archive_file.completion.output_path
  function_name    = "${local.resource_prefix}-completion"
  handler          = "index.handler"
  memory_size      = 512
  role             = aws_iam_role.completion.arn
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.completion.output_base64sha256
  timeout          = 60

  environment {
    variables = {
      DYNAMODB_TABLE_NAME    = aws_dynamodb_table.jobs.name
      TRANSCRIPT_BUCKET_NAME = aws_s3_bucket.transcripts.bucket
    }
  }

  tags = local.tags
}
