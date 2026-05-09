resource "aws_apigatewayv2_api" "http" {
  name          = "${local.resource_prefix}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["Authorization", "Content-Type"]
    allow_methods = ["DELETE", "GET", "OPTIONS", "POST"]
    allow_origins = local.allowed_cors_origins
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

resource "aws_apigatewayv2_integration" "billing_status" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.billing_status.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "billing_status" {
  api_id             = aws_apigatewayv2_api.http.id
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  route_key          = "GET /billing/status"
  target             = "integrations/${aws_apigatewayv2_integration.billing_status.id}"
}

resource "aws_apigatewayv2_integration" "billing_checkout" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.billing_checkout.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "billing_checkout" {
  api_id             = aws_apigatewayv2_api.http.id
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  route_key          = "POST /billing/checkout"
  target             = "integrations/${aws_apigatewayv2_integration.billing_checkout.id}"
}

resource "aws_apigatewayv2_integration" "stripe_webhook" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.stripe_webhook.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "stripe_webhook" {
  api_id             = aws_apigatewayv2_api.http.id
  authorization_type = "NONE"
  route_key          = "POST /billing/stripe-webhook"
  target             = "integrations/${aws_apigatewayv2_integration.stripe_webhook.id}"
}

resource "aws_apigatewayv2_integration" "enterprise_lead" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.enterprise_lead.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "enterprise_lead" {
  api_id             = aws_apigatewayv2_api.http.id
  authorization_type = "NONE"
  route_key          = "POST /enterprise-leads"
  target             = "integrations/${aws_apigatewayv2_integration.enterprise_lead.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  auto_deploy = true
  name        = "$default"

  default_route_settings {
    detailed_metrics_enabled = true
    throttling_burst_limit   = 100
    throttling_rate_limit    = 50
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

resource "aws_lambda_permission" "api_billing_status" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.billing_status.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
  statement_id  = "AllowApiGatewayInvokeBillingStatus"
}

resource "aws_lambda_permission" "api_billing_checkout" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.billing_checkout.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
  statement_id  = "AllowApiGatewayInvokeBillingCheckout"
}

resource "aws_lambda_permission" "api_stripe_webhook" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stripe_webhook.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
  statement_id  = "AllowApiGatewayInvokeStripeWebhook"
}

resource "aws_lambda_permission" "api_enterprise_lead" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.enterprise_lead.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
  statement_id  = "AllowApiGatewayInvokeEnterpriseLead"
}
