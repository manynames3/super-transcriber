// Decision: the app client enables both SRP and password auth so the custom frontend stays dependency-light while still satisfying the SRP requirement.
import * as cdk from "aws-cdk-lib";
import { aws_cognito as cognito } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface AuthStackProps extends cdk.StackProps {
  environmentName: "dev" | "prod";
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  public constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const removalPolicy =
      props.environmentName === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    this.userPool = new cognito.UserPool(this, "UserPool", {
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      autoVerify: { email: true },
      deletionProtection: props.environmentName === "prod",
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        otp: true,
        sms: false,
      },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireSymbols: true,
        requireUppercase: true,
      },
      removalPolicy,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      standardAttributes: {
        email: { required: true, mutable: false },
      },
      userVerification: {
        emailBody: "Your Super Transcriber verification code is {####}",
        emailSubject: "Verify your Super Transcriber account",
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
    });

    this.userPoolClient = this.userPool.addClient("UserPoolClient", {
      disableOAuth: true,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      enableTokenRevocation: true,
      generateSecret: false,
      preventUserExistenceErrors: true,
      refreshTokenValidity: cdk.Duration.days(30),
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
    });
  }
}
