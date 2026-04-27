import type { AuthSession } from "../types";

const region = import.meta.env.VITE_AWS_REGION;
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;

interface CognitoResponse {
  AuthenticationResult?: {
    AccessToken?: string;
    IdToken?: string;
    RefreshToken?: string;
  };
  message?: string;
  __type?: string;
}

function assertConfig() {
  if (!region || !userPoolId || !clientId) {
    throw new Error("Missing Cognito configuration. Check your Vite environment variables.");
  }
}

async function callCognito<TBody extends Record<string, unknown>>(
  target: string,
  body: TBody,
): Promise<CognitoResponse> {
  assertConfig();

  const response = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as CognitoResponse;
  if (!response.ok) {
    throw new Error(data.message ?? data.__type ?? "Cognito request failed.");
  }

  return data;
}

function mapAuthResult(email: string, result: CognitoResponse["AuthenticationResult"]): AuthSession {
  if (!result?.AccessToken || !result.IdToken) {
    throw new Error("Cognito did not return a usable session.");
  }

  return {
    accessToken: result.AccessToken,
    email,
    idToken: result.IdToken,
    refreshToken: result.RefreshToken ?? "",
  };
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const response = await callCognito("InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    AuthParameters: {
      PASSWORD: password,
      USERNAME: email,
    },
    ClientId: clientId,
  });

  return mapAuthResult(email, response.AuthenticationResult);
}

export async function register(email: string, password: string): Promise<void> {
  await callCognito("SignUp", {
    ClientId: clientId,
    Password: password,
    Username: email,
    UserAttributes: [
      {
        Name: "email",
        Value: email,
      },
    ],
  });
}

export async function verifyRegistration(email: string, code: string): Promise<void> {
  await callCognito("ConfirmSignUp", {
    ClientId: clientId,
    ConfirmationCode: code,
    Username: email,
  });
}

export async function refreshTokens(refreshToken: string, email: string): Promise<AuthSession> {
  const response = await callCognito("InitiateAuth", {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
    ClientId: clientId,
  });

  const session = mapAuthResult(email, response.AuthenticationResult);
  session.refreshToken = refreshToken;
  return session;
}

export async function logout(accessToken: string): Promise<void> {
  await callCognito("GlobalSignOut", {
    AccessToken: accessToken,
  });
}
