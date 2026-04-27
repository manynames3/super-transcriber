import * as cdk from "aws-cdk-lib";
import { aws_s3 as s3 } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface StorageStackProps extends cdk.StackProps {
  allowedOrigin: string;
  environmentName: "dev" | "prod";
}

export class StorageStack extends cdk.Stack {
  public readonly uploadBucket: s3.Bucket;
  public readonly transcriptBucket: s3.Bucket;

  public constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const removalPolicy =
      props.environmentName === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;
    const autoDeleteObjects = props.environmentName !== "prod";

    this.uploadBucket = new s3.Bucket(this, "UploadBucket", {
      autoDeleteObjects,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedHeaders: ["Content-Type", "x-amz-acl", "x-amz-meta-*"],
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: [props.allowedOrigin],
          maxAge: 300,
        },
      ],
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [
        {
          enabled: true,
          expiration: cdk.Duration.days(3),
          prefix: "uploads/",
        },
      ],
      removalPolicy,
      versioned: false,
    });

    this.transcriptBucket = new s3.Bucket(this, "TranscriptBucket", {
      autoDeleteObjects,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedHeaders: ["Content-Type"],
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: [props.allowedOrigin],
          maxAge: 300,
        },
      ],
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [
        {
          enabled: true,
          expiration: cdk.Duration.days(90),
          prefix: "transcripts/",
        },
      ],
      removalPolicy,
      versioned: false,
    });

    new cdk.CfnOutput(this, "UploadBucketName", {
      value: this.uploadBucket.bucketName,
    });

    new cdk.CfnOutput(this, "TranscriptBucketName", {
      value: this.transcriptBucket.bucketName,
    });
  }
}
