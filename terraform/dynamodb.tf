resource "aws_dynamodb_table" "jobs" {
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  name         = var.dynamodb_table_name
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "transcribeJobName"
    type = "S"
  }

  global_secondary_index {
    hash_key        = "transcribeJobName"
    name            = "TranscribeJobIndex"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  tags = local.tags
}
