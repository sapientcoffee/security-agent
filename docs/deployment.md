# Deployment Guide

This guide explains how to deploy the full Security Audit Platform to Google Cloud Platform.

## 🧱 Prerequisites
1.  **GCP Project:** Create a project and enable the following APIs:
    - **Cloud Run**
    - **Cloud Build**
    - **Firestore**
    - **Secret Manager**
    - **Cloud Tasks**
2.  **Firestore:** Initialize Firestore in **Native Mode**.
3.  **Cloud Tasks Queue:** Create a queue named `pr-analysis-queue`.
    ```bash
    gcloud tasks queues create pr-analysis-queue --location=us-central1
    ```
4.  **API Key:** Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## 1. Deploy the Backend Agent
The Agent must be deployed first. It requires permissions to manage secrets in Secret Manager.

```bash
cd agent

# 1a. Create the secret in Secret Manager
printf "YOUR_GEMINI_KEY" | gcloud secrets create GOOGLE_API_KEY --data-file=-

# 1b. Grant access to the service account
gcloud secrets add-iam-policy-binding GOOGLE_API_KEY \
  --member="serviceAccount:[PROJECT_NUMBER]-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 1c. Build and deploy
gcloud run deploy security-audit-agent \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GOOGLE_API_KEY=GOOGLE_API_KEY:latest" \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID"
```
**Note the Service URL:** `https://security-audit-agent-xxxx.run.app`

---

## 2. Deploy the GitHub Bot
The bot handles webhooks and enqueues tasks. It needs permissions to access Secret Manager and create Cloud Tasks.

```bash
cd github-bot

# Deploy the bot
gcloud run deploy github-security-bot \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3001 \
  --set-env-vars="AGENT_API_URL=https://[AGENT_URL]/api/analyze,AGENT_API_TOKEN=$(gcloud auth print-identity-token),GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,BOT_URL=https://[BOT_URL],TASK_SERVICE_ACCOUNT=your-sa@project.iam.gserviceaccount.com"
```
**Note:** `BOT_URL` is the URL of this service itself (required for Cloud Tasks to call back).

---

## 3. Deploy the Frontend UI
The frontend requires build-time arguments.

```bash
cd frontend

# Submit to Cloud Build with substitutions
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_VITE_API_URL="https://[AGENT_URL]",_VITE_FIREBASE_API_KEY="xxx",... \
  .

# Deploy the resulting image
gcloud run deploy security-audit-frontend \
  --image gcr.io/[PROJECT_ID]/security-audit-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 🔒 Security & IAM Roles
For the platform to function correctly, ensure the **Compute Engine default service account** (or your custom service account) has the following roles:
- `roles/secretmanager.admin` (Agent: to create secrets)
- `roles/secretmanager.secretAccessor` (Bot: to read keys)
- `roles/cloudtasks.enqueuer` (Bot: to create tasks)
- `roles/iam.serviceAccountUser` (Bot: to use the task SA)
- `roles/run.invoker` (Grant to Task SA on the Bot service to allow secure callbacks)
