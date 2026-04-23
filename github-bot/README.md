# GitHub Security Review Bot

A lightweight middleware service that listens for GitHub Pull Request events and triggers automated security audits using the core agent.

## 🚀 Key Features
- **Dynamic Configuration:** Loads credentials (App ID, Private Key, Secret) from Firestore based on the incoming webhook ID.
- **Trace Correlation:** Passes Cloud Trace IDs to the agent for unified request logging.
- **Manual Overrides:** Reviews can be triggered by adding the `security-review` label to any PR.
- **Auto-History:** Records review outcomes (summary, finding count) to Firestore.

## 📡 Webhook Endpoint
- **`POST /api/webhook`**: The primary listener for GitHub events.
  - Required Header: `X-Hub-Signature-256` (verified using app-specific secret).
  - Supported Events: `pull_request`, `installation`, `installation_repositories`.

## 📦 Deployment (Cloud Run)

1. **Build Image**:
   ```bash
   gcloud builds submit --tag gcr.io/[PROJECT_ID]/github-security-bot .
   ```

2. **Deploy Service**:
   ```bash
   gcloud run deploy github-security-bot \
     --image gcr.io/[PROJECT_ID]/github-security-bot \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 3001 \
     --set-env-vars="AGENT_API_URL=https://[AGENT_URL]/api/analyze,AGENT_API_TOKEN=[TOKEN],GOOGLE_CLOUD_PROJECT=[PROJECT_ID]"
   ```

## 🛠 Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Create a `.env` file in `/github-bot`:
   ```env
   PORT=3001
   GOOGLE_CLOUD_PROJECT=your_project_id
   AGENT_API_URL=http://localhost:8080/api/analyze
   AGENT_API_TOKEN=your_token
   ```

3. **Start Bot**:
   ```bash
   npm start
   ```

4. **Webhook Proxy**:
   Use `smee-client` or similar to tunnel GitHub events to `http://localhost:3001/api/webhook`.

## 🔒 Observability
The bot uses structured JSON logging. Search for `resource.labels.service_name="github-security-bot"` in the Cloud Logs Explorer to see correlated traces across the entire platform.
