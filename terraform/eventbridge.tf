resource "aws_cloudwatch_event_rule" "transcribe_completion" {
  description = "Capture Amazon Transcribe job completion events."
  event_pattern = jsonencode({
    source        = ["aws.transcribe"]
    "detail-type" = ["Transcribe Job State Change"]
    detail = {
      TranscriptionJobStatus = ["COMPLETED", "FAILED"]
    }
  })
  name = "${local.resource_prefix}-transcribe-completion"
  tags = local.tags
}

resource "aws_cloudwatch_event_target" "completion_lambda" {
  arn       = aws_lambda_function.completion.arn
  rule      = aws_cloudwatch_event_rule.transcribe_completion.name
  target_id = "CompletionLambda"
}

resource "aws_lambda_permission" "eventbridge_completion" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.completion.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.transcribe_completion.arn
  statement_id  = "AllowEventBridgeInvokeCompletion"
}
