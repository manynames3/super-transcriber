output "api_base_url" {
  value = aws_apigatewayv2_api.http.api_endpoint
}

output "aws_region" {
  value = var.aws_region
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.jobs.name
}

output "transcript_bucket_name" {
  value = aws_s3_bucket.transcripts.bucket
}

output "upload_bucket_name" {
  value = aws_s3_bucket.uploads.bucket
}
