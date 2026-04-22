# Implementation Plan: Multi-Tenant GitHub Bot

## 📋 Micro-Step Checklist

- [ ] Phase 1: Database & Model (The Core Agent)
  - [ ] Step 1.A: Integrate `firebase-admin` into the `github-bot` service. Ensure it initializes using default Google Cloud credentials.
  - [ ] Step 1.B: Define a Firestore collection `github_apps` indexed by `appId` (or `uid` containing `appId`, `webhookSecret`, `privateKey`, and the owning `uid`).

- [ ] Phase 2: Frontend Integration (User Portal)
  - [ ] Step 2.A: Add a new "GitHub Setup" component in the React frontend (`frontend/src/`).
  - [ ] Step 2.B: Implement the Manifest generation logic inside the authenticated frontend component, allowing the user to start the creation flow. Crucially, append the user's `uid` (or a secure state token) to the `redirect_url`.

- [ ] Phase 3: Setup Callback Refactoring
  - [ ] Step 3.A: Move the `/setup-callback` logic from the unauthenticated bot webhook server to the **authenticated Core Agent API** (`agent/src/server.js`) to securely finalize the app creation.
  - [ ] Step 3.B: In the new `/setup-callback` (e.g., `POST /api/github/finalize-setup`), accept the `code`, verify the user's Firebase token, exchange the code for the GitHub App credentials, and store them securely in the user's Firestore document.

- [ ] Phase 4: Dynamic Webhook Processing (The Bot)
  - [ ] Step 4.A: Update the `github-bot`'s `/api/webhook` handler to extract `X-GitHub-Hook-Installation-Target-Id` (which is the App ID).
  - [ ] Step 4.B: Query Firestore for the App Configuration corresponding to that App ID to retrieve the correct `webhookSecret` and `privateKey`.
  - [ ] Step 4.C: Perform the HMAC verification dynamically using the retrieved secret.
  - [ ] Step 4.D: Process the PR diff and post the review using the dynamic `privateKey`.

- [ ] Phase 5: Cleanup & Deployment
  - [ ] Step 5.A: Remove the global `GITHUB_APP_ID`, `GITHUB_WEBHOOK_SECRET`, and `GITHUB_PRIVATE_KEY` env vars from the Cloud Run deployment scripts.
  - [ ] Step 5.B: Redeploy all services (Frontend, Agent, Bot).