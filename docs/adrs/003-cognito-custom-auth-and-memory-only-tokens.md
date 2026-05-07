# ADR-003: Use Cognito JWT Auth with Custom Forms and In-Memory Token Storage

## Status

Accepted

## Context

The app needs a custom-branded auth flow rather than Cognito Hosted UI, and the product requirements explicitly avoid localStorage, sessionStorage, and cookies for token persistence.

## Decision

Use a Cognito User Pool and app client with custom React login, registration, and email verification forms. Store access, ID, and refresh tokens only in Zustand memory. Attach the access token to API requests and refresh exactly once on `401` via Cognito `REFRESH_TOKEN_AUTH`.

## Consequences

- The frontend keeps full control of the auth experience.
- Session state disappears on full page reload, which is acceptable for the current product constraints.
- JWT validation can stay at API Gateway instead of being reimplemented inside each Lambda handler.
