import * as cdk from "aws-cdk-lib";
import {
  aws_apigatewayv2 as apigwv2,
  aws_cognito as cognito,
  aws_dynamodb as dynamodb,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodejs,
  aws_s3 as s3,
} from "aws-cdk-lib";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Construct } from "constructs";
import * as path from "node:path";

export interface ApiStackProps extends cdk.StackProps {
  allowedOrigin: string;
  environmentName: "dev" | "prod";
  transcriptBucket: s3.Bucket;
  uploadBucket: s3.Bucket;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
}

export class ApiStack extends cdk.Stack {
  public readonly table: dynamodb.Table;

  public constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const removalPolicy =
      props.environmentName === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    this.table = new dynamodb.Table(this, "JobsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: props.environmentName === "prod",
      },
      removalPolicy,
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      tableName: "super-transcriber",
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "TranscribeJobIndex",
      partitionKey: { name: "transcribeJobName", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const lambdaDefaults: Omit<lambdaNodejs.NodejsFunctionProps, "entry" | "role"> = {
      architecture: lambda.Architecture.ARM_64,
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
      },
      environment: {
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        DYNAMODB_TABLE_NAME: this.table.tableName,
        TRANSCRIPT_BUCKET_NAME: props.transcriptBucket.bucketName,
        UPLOAD_BUCKET_NAME: props.uploadBucket.bucketName,
      },
      handler: "handler",
      memorySize: 512,
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
    };

    const uploadRole = this.createLambdaRole("UploadUrlRole", [
      new iam.PolicyStatement({
        actions: ["dynamodb:Query"],
        resources: [this.table.tableArn],
      }),
      new iam.PolicyStatement({
        actions: ["s3:PutObject"],
        resources: [props.uploadBucket.arnForObjects("uploads/*")],
      }),
    ]);

    const transcribeRole = this.createLambdaRole("TranscribeRole", [
      new iam.PolicyStatement({
        actions: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query", "dynamodb:UpdateItem"],
        resources: [this.table.tableArn],
      }),
      new iam.PolicyStatement({
        actions: ["transcribe:StartTranscriptionJob"],
        resources: ["*"],
      }),
    ]);

    const jobStatusRole = this.createLambdaRole("JobStatusRole", [
      new iam.PolicyStatement({
        actions: ["dynamodb:GetItem"],
        resources: [this.table.tableArn],
      }),
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [props.transcriptBucket.arnForObjects("transcripts/*")],
      }),
      new iam.PolicyStatement({
        actions: ["transcribe:GetTranscriptionJob"],
        resources: ["*"],
      }),
    ]);

    const jobsListRole = this.createLambdaRole("JobsListRole", [
      new iam.PolicyStatement({
        actions: ["dynamodb:Query"],
        resources: [this.table.tableArn],
      }),
    ]);

    const jobDeleteRole = this.createLambdaRole("JobDeleteRole", [
      new iam.PolicyStatement({
        actions: ["dynamodb:UpdateItem"],
        resources: [this.table.tableArn],
      }),
    ]);

    const uploadFunction = this.createNodeFunction("UploadUrlFunction", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambda/upload-url/index.ts"),
      role: uploadRole,
    });

    const transcribeFunction = this.createNodeFunction("TranscribeFunction", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambda/transcribe/index.ts"),
      role: transcribeRole,
    });

    const jobStatusFunction = this.createNodeFunction("JobStatusFunction", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambda/job-status/index.ts"),
      role: jobStatusRole,
    });

    const jobsListFunction = this.createNodeFunction("JobsListFunction", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambda/jobs-list/index.ts"),
      role: jobsListRole,
    });

    const jobDeleteFunction = this.createNodeFunction("JobDeleteFunction", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../lambda/job-delete/index.ts"),
      role: jobDeleteRole,
    });

    const api = new apigwv2.HttpApi(this, "HttpApi", {
      corsPreflight: {
        allowHeaders: ["Authorization", "Content-Type"],
        allowMethods: [apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.POST, apigwv2.CorsHttpMethod.DELETE],
        allowOrigins: [props.allowedOrigin],
        maxAge: cdk.Duration.seconds(300),
      },
    });

    const authorizer = new HttpJwtAuthorizer(
      "CognitoAuthorizer",
      `https://cognito-idp.${this.region}.amazonaws.com/${props.userPool.userPoolId}`,
      {
        jwtAudience: [props.userPoolClient.userPoolClientId],
      },
    );

    api.addRoutes({
      authorizer,
      integration: new HttpLambdaIntegration("UploadUrlIntegration", uploadFunction),
      methods: [apigwv2.HttpMethod.POST],
      path: "/upload-url",
    });

    api.addRoutes({
      authorizer,
      integration: new HttpLambdaIntegration("TranscribeIntegration", transcribeFunction),
      methods: [apigwv2.HttpMethod.POST],
      path: "/transcribe",
    });

    api.addRoutes({
      authorizer,
      integration: new HttpLambdaIntegration("JobStatusIntegration", jobStatusFunction),
      methods: [apigwv2.HttpMethod.GET],
      path: "/job/{jobId}",
    });

    api.addRoutes({
      authorizer,
      integration: new HttpLambdaIntegration("JobsListIntegration", jobsListFunction),
      methods: [apigwv2.HttpMethod.GET],
      path: "/jobs",
    });

    api.addRoutes({
      authorizer,
      integration: new HttpLambdaIntegration("JobDeleteIntegration", jobDeleteFunction),
      methods: [apigwv2.HttpMethod.DELETE],
      path: "/job/{jobId}",
    });

    const defaultStage = api.defaultStage?.node.defaultChild as apigwv2.CfnStage | undefined;
    if (defaultStage) {
      defaultStage.defaultRouteSettings = {
        detailedMetricsEnabled: true,
      };
      defaultStage.routeSettings = {
        "POST /transcribe": {
          throttlingBurstLimit: 1,
          throttlingRateLimit: 5 / 60,
        },
        "POST /upload-url": {
          throttlingBurstLimit: 2,
          throttlingRateLimit: 10 / 60,
        },
        "GET /job/{jobId}": {
          throttlingBurstLimit: 10,
          throttlingRateLimit: 1,
        },
      };
    }

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.apiEndpoint,
    });

    new cdk.CfnOutput(this, "JobsTableName", {
      value: this.table.tableName,
    });
  }

  private createLambdaRole(id: string, statements: iam.PolicyStatement[]): iam.Role {
    const role = new iam.Role(this, id, {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
    });

    for (const statement of statements) {
      role.addToPolicy(statement);
    }

    return role;
  }

  private createNodeFunction(
    id: string,
    props: lambdaNodejs.NodejsFunctionProps,
  ): lambdaNodejs.NodejsFunction {
    return new lambdaNodejs.NodejsFunction(this, id, props);
  }
}
