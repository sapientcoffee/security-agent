# Deployment Guide

This guide explains how to deploy the full Security Audit Platform to Google Cloud Platform.

## 🧱 Prerequisites
1.  **GCP Project:** Create a project and enable **Cloud Run**, **Cloud Build**, and **Firestore**.
2.  **Firestore:** Initialize Firestore in **Native Mode**.
3.  **API Key:** Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## 1. Deploy the Backend Agent
The Agent must be deployed first as the other services depend on its URL.

```bash
cd agent

# Build and deploy
gcloud run deploy security-audit-agent \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_API_KEY=YOUR_GEMINI_KEY,GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID"
```
**Note the Service URL:** `https://security-audit-agent-xxxx.run.app`

---

## 2. Deploy the GitHub Bot
The bot handles incoming webhooks and triggers the agent.

```bash
cd github-bot

# Deploy the bot
gcloud run deploy github-security-bot \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3001 \
  --set-env-vars="AGENT_API_URL=https://[AGENT_URL]/api/analyze,AGENT_API_TOKEN=$(gcloud auth print-identity-token),GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID"
```
**Note the Service URL:** `https://github-security-bot-xxxx.run.app`

---

## 3. Deploy the Frontend UI
The frontend requires build-time arguments to point to the correct backend and Firebase project.

```bash
cd frontend

# Submit to Cloud Build with substitutions
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_VITE_API_URL="https://[AGENT_URL]",_VITE_FIREBASE_API_KEY="xxx",_VITE_FIREBASE_PROJECT_ID="xxx",... \
  .

# Deploy the resulting image
gcloud run deploy security-audit-frontend \
  --image gcr.io/[PROJECT_ID]/security-audit-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 🔒 Post-Deployment Security
1.  **Service Accounts:** For production, the GitHub Bot should use a dedicated Service Account. Grant this account the `roles/run.invoker` role on the Agent service.
2.  **Agent Authentication:** Update the `AGENT_API_TOKEN` to be a long-lived service account token or implement dynamic OIDC token fetching in the bot's `agent-client.js`.
