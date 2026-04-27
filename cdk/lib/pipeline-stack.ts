import * as cdk from "aws-cdk-lib";
import {
  aws_dynamodb as dynamodb,
  aws_events as events,
  aws_events_targets as targets,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodejs,
  aws_s3 as s3,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "node:path";

export interface PipelineStackProps extends cdk.StackProps {
  environmentName: "dev" | "prod";
  table: dynamodb.Table;
  transcriptBucket: s3.Bucket;
}

export class PipelineStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const role = new iam.Role(this, "CompletionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:Query"],
        resources: [props.table.tableArn, `${props.table.tableArn}/index/TranscribeJobIndex`],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:UpdateItem"],
        resources: [props.table.tableArn],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject"],
        resources: [props.transcriptBucket.arnForObjects("transcripts/*")],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["transcribe:GetTranscriptionJob"],
        resources: ["*"],
      }),
    );

    const completionFunction = new lambdaNodejs.NodejsFunction(this, "CompletionFunction", {
      architecture: lambda.Architecture.ARM_64,
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
      },
      entry: path.join(__dirname, "../lambda/completion/index.ts"),
      environment: {
        DYNAMODB_TABLE_NAME: props.table.tableName,
        TRANSCRIPT_BUCKET_NAME: props.transcriptBucket.bucketName,
      },
      handler: "handler",
      memorySize: 512,
      role,
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(60),
    });

    new events.Rule(this, "TranscribeCompletionRule", {
      eventPattern: {
        detail: {
          TranscriptionJobStatus: ["COMPLETED", "FAILED"],
        },
        detailType: ["Transcribe Job State Change"],
        source: ["aws.transcribe"],
      },
      targets: [new targets.LambdaFunction(completionFunction)],
    });
  }
}
