resource "aws_apigatewayv2_api" "http" {
  name          = "${local.resource_prefix}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["Authorization", "Content-Type"]
    allow_methods = ["DELETE", "GET", "OPTIONS", "POST"]
    allow_origins = [var.allowed_origin]
    max_age       = 300
  }

  tags = local.tags
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.http.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${local.resource_prefix}-cognito-jwt"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.web.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
  }
}

resource "aws_apigatewayv2_integration" "upload_url" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.upload_url.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "upload_url" {
  api_id             = aws_apigatewayv2_api.http.id
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  route_key          = "POST /upload-url"
  target             = "integrations/${aws_apigatewayv2_integration.upload_url.id}"
}

resource "aws_apigatewayv2_integration" "transcribe" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.transcribe.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "transcribe" {
  api_id             = aws_apigatewayv2_api.http.id
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  route_key          = "POST /transcribe"
  target             = "integrations/${aws_apigatewayv2_integration.transcribe.id}"
}

resource "aws_apigatewayv2_integration" "job_status" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.job_status.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "job_status" {
  api_id             = aws_apigatewayv2_api.http.id
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  route_key          = "GET /job/{jobId}"
  target             = "integrations/${aws_apigatewayv2_integration.job_status.id}"
}

resource "aws_apigatewayv2_integration" "jobs_list" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.jobs_list.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "jobs_list" {
  api_id             = aws_apigatewayv2_api.http.id
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  route_key          = "GET /jobs"
  target             = "integrations/${aws_apigatewayv2_integration.jobs_list.id}"
}

resource "aws_apigatewayv2_integration" "job_delete" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.job_delete.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "job_delete" {
  api_id             = aws_apigatewayv2_api.http.id
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  route_key          = "DELETE /job/{jobId}"
  target             = "integrations/${aws_apigatewayv2_integration.job_delete.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  auto_deploy = true
  name        = "$default"

  default_route_settings {
    detailed_metrics_enabled = true
  }

  route_settings {
    route_key              = aws_apigatewayv2_route.upload_url.route_key
    throttling_burst_limit = 2
    throttling_rate_limit  = 0.1666666667
  }

  route_settings {
    route_key              = aws_apigatewayv2_route.transcribe.route_key
    throttling_burst_limit = 1
    throttling_rate_limit  = 0.0833333333
  }

  route_settings {
    route_key              = aws_apigatewayv2_route.job_status.route_key
    throttling_burst_limit = 10
    throttling_rate_limit  = 1
  }

  tags = local.tags
}

resource "aws_lambda_permission" "api_upload_url" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.upload_url.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
  statement_id  = "AllowApiGatewayInvokeUploadUrl"
}

resource "aws_lambda_permission" "api_transcribe" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.transcribe.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
  statement_id  = "AllowApiGatewayInvokeTranscribe"
}

resource "aws_lambda_permission" "api_job_status" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.job_status.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
  statement_id  = "AllowApiGatewayInvokeJobStatus"
}

resource "aws_lambda_permission" "api_jobs_list" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.jobs_list.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
  statement_id  = "AllowApiGatewayInvokeJobsList"
}

resource "aws_lambda_permission" "api_job_delete" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.job_delete.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
  statement_id  = "AllowApiGatewayInvokeJobDelete"
}
