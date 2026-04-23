# Design: Secure GitHub App Private Key Storage

## Overview
We will transition from storing GitHub App private keys in Firestore to storing them in Google Cloud Secret Manager. Firestore will act as a registry, storing metadata and the *name* of the secret in Secret Manager.

## Architectural Changes

### 1. Data Model
Firestore `github_apps` document will be updated:
- `privateKey`: (REMOVED or NULLIFIED for new apps)
- `secretName`: String (e.g., `projects/my-project/secrets/gh-app-12345-key`)
- `useSecretManager`: Boolean (Flag to indicate the new storage method)

### 2. Components

#### A. Secret Utility (`lib/secrets.js`)
A new utility module to handle:
- `upsertSecret(appId, pemContent)`: Creates or updates a secret version.
- `getSecret(secretName)`: Retrieves the secret value.

#### B. Agent Callback (`agent/src/server.js`)
Modify the `/api/github/callback` handler:
1.  Receive `appConfig`.
2.  Call `upsertSecret(appId, appConfig.pem)`.
3.  Store `secretName` and `useSecretManager: true` in Firestore.
4.  Do NOT store `appConfig.pem` in the `privateKey` field.

#### C. Bot Configuration (`github-bot/src/server.js`)
Modify `getAppConfig(appId)`:
1.  Retrieve Firestore document.
2.  If `useSecretManager` is true:
    - Fetch PEM from Secret Manager using `secretName`.
    - Return PEM in the `privateKey` property of the config object (to maintain compatibility with existing `GitHubService` instantiation).
3.  Else:
    - Return config as is (backward compatibility).

## Security Considerations
- **IAM:** Ensure the Cloud Run service accounts have appropriate Secret Manager roles.
- **Audit Logs:** Secret Manager access is logged by default in GCP.
- **Data in Transit:** Secret Manager uses TLS for all communication.
- **Data at Rest:** Secret Manager encrypts all secrets.

## Migration Path
- Existing apps will continue to work using the plaintext `privateKey` in Firestore.
- New apps will use Secret Manager.
- (Optional) A one-time migration script could move all existing keys to Secret Manager and update Firestore records.
