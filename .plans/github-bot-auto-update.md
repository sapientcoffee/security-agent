# Implementation Plan: Auto-Update Cloud Run Environment Variables

## 📋 Micro-Step Checklist
- [ ] Phase 1: Dependency Setup
  - [ ] Step 1.A: Install `google-auth-library` in `github-bot/package.json` to handle Application Default Credentials (ADC).
- [ ] Phase 2: Implement Self-Update Logic
  - [ ] Step 2.A: Modify `github-bot/src/server.js` `GET /setup-callback` route.
  - [ ] Step 2.B: Add a function to authenticate via Google Cloud Identity.
  - [ ] Step 2.C: Use the Cloud Run Admin API (`PATCH https://run.googleapis.com/v2/projects/{project}/locations/{region}/services/{service}`) to update the service's `template.containers[0].env` array with the newly acquired GitHub credentials.
- [ ] Phase 3: UX Update & Deployment
  - [ ] Step 3.A: Change the success HTML page to indicate that the service is restarting and updating itself automatically.
  - [ ] Step 3.B: Rebuild and deploy the `github-bot` Docker container.