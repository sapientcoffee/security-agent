# GitHub Security Review Bot

Standalone service that orchestrates between GitHub webhooks and the Core Security Agent to provide automated PR reviews.

## 🚀 Features
- **Automatic Scanning:** Triggers on PR creation or update.
- **Secure:** HMAC-SHA256 webhook verification.
- **Actionable Feedback:** Both inline comments and high-level summaries.
- **Decoupled Architecture:** Acts as middleware to the core analysis agent.

## 🛠 Setup & Local Development

For a detailed step-by-step guide on creating a GitHub App and obtaining all required variables, see the [GitHub App Setup Guide](../docs/github-app-setup.md).

1. **Install Dependencies:**
   ```bash
   cd github-bot
   npm install
   ```

2. **Configure Environment:**
   Create a `.env` file:
   ```env
   PORT=3001
   GITHUB_APP_ID=your_id
   GITHUB_PRIVATE_KEY=your_pem_string
   GITHUB_WEBHOOK_SECRET=your_secret
   AGENT_API_URL=http://localhost:8080/api/analyze
   AGENT_API_TOKEN=your_agent_token
   ```

3. **Start Servers:**
   - Core Agent: `cd agent && npm start`
   - GitHub Bot: `cd github-bot && npm start`

4. **Webhook Proxy:**
   Use a tool like `smee-client` to forward GitHub events to `http://localhost:3001/api/webhook`.

## 🧪 Testing
```bash
npm test
```

## 📦 Deployment (Cloud Run)

1. **Build Image:**
   ```bash
   gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/github-security-bot .
   ```

2. **Deploy Service:**
   ```bash
   gcloud run deploy github-security-bot \
     --image gcr.io/$(gcloud config get-value project)/github-security-bot \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars="GITHUB_APP_ID=...,GITHUB_WEBHOOK_SECRET=...,AGENT_API_URL=..."
   ```
