# Research Report: Secure GitHub App Private Key Storage

## Current State Analysis
- **Firestore Collection:** `github_apps`
- **Key Field:** `privateKey` (currently stores PEM string).
- **Writer:** `agent/src/server.js` (Route: `/api/github/callback`).
- **Reader:** `github-bot/src/server.js` (Function: `getAppConfig`).
- **SDKs:** Uses `firebase-admin` for Firestore. No Secret Manager SDK currently installed.

## Technical Grounding
- **Secret Manager SDK:** `@google-cloud/secret-manager`.
- **Secret Naming:** A good pattern would be `gh-app-${appId}-key`.
- **Project Context:** The project ID can be retrieved using `process.env.GOOGLE_CLOUD_PROJECT` or the metadata server.
- **Permissions:** 
    - The `agent` service account needs `roles/secretmanager.admin` or `roles/secretmanager.secretVersionManager` + `roles/secretmanager.viewer`.
    - The `github-bot` service account needs `roles/secretmanager.secretAccessor`.

## Findings
- `agent/src/server.js` uses `appConfig.pem` from the GitHub API response and stores it as `privateKey` in Firestore.
- `github-bot/src/server.js`'s `getAppConfig` simply returns `doc.data()`, and the caller uses `appConfig.privateKey`.

## Implementation Strategy
1.  Add `@google-cloud/secret-manager` to `agent` and `github-bot`.
2.  Create a utility in both services (or shared) to interact with Secret Manager.
3.  Update `agent`'s callback to:
    - Create/Update secret in Secret Manager with the PEM content.
    - Store the secret name (or a flag) in Firestore.
4.  Update `github-bot`'s `getAppConfig` to:
    - Fetch the Firestore doc.
    - If `privateKey` looks like a secret reference (or if a new field `secretName` exists), fetch from Secret Manager.
    - Else (for backward compatibility), use the plaintext `privateKey`.
