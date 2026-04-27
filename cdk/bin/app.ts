#!/usr/bin/env node
// Decision: dev deployments default to destroy-on-delete, while prod retains stateful resources.
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ApiStack } from "../lib/api-stack";
import { AuthStack } from "../lib/auth-stack";
import { PipelineStack } from "../lib/pipeline-stack";
import { StorageStack } from "../lib/storage-stack";

const app = new cdk.App();

const environmentName = app.node.tryGetContext("env") ?? "dev";
if (environmentName !== "dev" && environmentName !== "prod") {
  throw new Error('CDK context "env" must be either "dev" or "prod".');
}

const allowedOrigin = app.node.tryGetContext("allowedOrigin");
if (typeof allowedOrigin !== "string" || !allowedOrigin.startsWith("https://")) {
  throw new Error('CDK context "allowedOrigin" must be a valid https origin.');
}

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
};

const authStack = new AuthStack(app, `SuperTranscriberAuth-${environmentName}`, {
  env,
  environmentName,
});

const storageStack = new StorageStack(app, `SuperTranscriberStorage-${environmentName}`, {
  env,
  allowedOrigin,
  environmentName,
});

const apiStack = new ApiStack(app, `SuperTranscriberApi-${environmentName}`, {
  env,
  allowedOrigin,
  environmentName,
  transcriptBucket: storageStack.transcriptBucket,
  uploadBucket: storageStack.uploadBucket,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
});

const pipelineStack = new PipelineStack(app, `SuperTranscriberPipeline-${environmentName}`, {
  env,
  environmentName,
  table: apiStack.table,
  transcriptBucket: storageStack.transcriptBucket,
});

storageStack.addDependency(authStack);
apiStack.addDependency(authStack);
apiStack.addDependency(storageStack);
pipelineStack.addDependency(apiStack);
