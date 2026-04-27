resource "aws_cognito_user_pool" "main" {
  name                     = "${local.resource_prefix}-users"
  auto_verified_attributes = ["email"]
  deletion_protection      = var.environment == "prod" ? "ACTIVE" : "INACTIVE"
  mfa_configuration        = "OPTIONAL"
  username_attributes      = ["email"]

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  schema {
    attribute_data_type = "String"
    mutable             = false
    name                = "email"
    required            = true

    string_attribute_constraints {
      max_length = 2048
      min_length = 5
    }
  }

  software_token_mfa_configuration {
    enabled = true
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_message        = "Your Super Transcriber verification code is {####}"
    email_subject        = "Verify your Super Transcriber account"
  }

  tags = local.tags
}

resource "aws_cognito_user_pool_client" "web" {
  name                                 = "${local.resource_prefix}-web"
  user_pool_id                         = aws_cognito_user_pool.main.id
  allowed_oauth_flows_user_pool_client = false
  enable_token_revocation              = true
  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ]
  generate_secret               = false
  prevent_user_existence_errors = "ENABLED"
  refresh_token_validity        = 30
  supported_identity_providers  = ["COGNITO"]

  token_validity_units {
    refresh_token = "days"
  }
}
