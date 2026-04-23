# Security Audit Agent Platform

A multi-tenant platform for automated functional and security audits of source code. Powered by Google Gemini 3.1 Flash and built for Google Cloud Run.

## 🏗️ Architecture

The system is a distributed platform consisting of three primary services:

- **Frontend (React + Vite + Tailwind)**: A modern user portal for managing integrations, viewing review history, and performing manual on-demand audits.
- **Backend Agent (Node.js/Express)**: The core analysis engine. It handles multi-tenant data in Firestore, clones Git repositories, and interfaces with the Gemini model.
- **GitHub Bot (Node.js)**: A lightweight webhook listener that orchestrates automated Pull Request reviews. It dynamically loads user configurations from Firestore.

### Key Workflows
1. **Automated PR Reviews**: When a PR is opened or updated, the GitHub Bot looks up the owner's credentials in Firestore, fetches the diff, and requests an analysis from the Agent.
2. **On-Demand Audits**: Users can paste code, upload files, or provide public Git URLs directly in the Frontend for immediate AI feedback.
3. **One-Click Integration**: Users can create and link their own GitHub App in seconds using the Manifest-based setup flow.

## 📁 Project Structure

- **[`/agent`](./agent)**: Core analysis service and API.
- **[`/frontend`](./frontend)**: User dashboard and manual audit interface.
- **[`/github-bot`](./github-bot)**: PR review automation service.
- **[`/docs`](./docs)**: Detailed setup and architectural documentation.

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Google Cloud Project with Firestore enabled
- Gemini API Key (from Google AI Studio)

### Local Development

1. **Install All Dependencies**:
   ```bash
   npm install
   ```

2. **Backend Setup**:
   ```bash
   cd agent
   # Create .env with GOOGLE_API_KEY and firebase config
   npm run dev
   ```

3. **Frontend Setup**:
   ```bash
   cd frontend
   # Create .env with VITE_API_URL and firebase config
   npm run dev
   ```

## 📦 Deployment (Cloud Run)

The platform is designed to be deployed as three separate services on Cloud Run.

1. **Deploy Agent**: Build and deploy the backend service first.
2. **Deploy Bot**: Deploy the webhook listener.
3. **Deploy Frontend**: Build the UI using `gcloud builds submit` to bake in environment variables.

For detailed instructions, see [the Deployment Guide](./docs/deployment.md).

## 🔒 Security & Multi-Tenancy
- **Data Isolation:** User-specific GitHub credentials (private keys, secrets) are stored in Firestore and linked to Firebase Auth UIDs.
- **Webhook Security:** Every incoming GitHub event is verified using HMAC-SHA256 with the app-specific secret.
- **Traceability:** Distributed tracing is implemented across all services for deep observability in Cloud Logging.

---
&copy; 2026 Security Audit Agent &bull; Functional and Security Analysis for the AI Era.
