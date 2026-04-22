# Implementation Plan: Automating GitHub App Manifest Callback

## 📋 Micro-Step Checklist
- [ ] Phase 1: Research and Design
  - [ ] Step 1.A: Research the exact GitHub API endpoint to convert a manifest code into App credentials (`POST /app-manifests/{code}/conversions`).
  - [ ] Step 1.B: Understand the JSON response containing `id`, `client_id`, `webhook_secret`, and `pem`.
- [ ] Phase 2: Implementation
  - [ ] Step 2.A: Update `github-bot/src/server.js` `GET /setup-callback` route to make the POST request to GitHub.
  - [ ] Step 2.B: Render a dynamic HTML page displaying the exact `gcloud run services update` command populated with the retrieved variables.
  - [ ] Step 2.C: Provide a secure way for the user to copy/download the `.pem` file directly from the success page.
- [ ] Phase 3: Deployment
  - [ ] Step 3.A: Rebuild and deploy the `github-bot` Cloud Run service.