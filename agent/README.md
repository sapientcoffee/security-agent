# Security Audit Remote Agent

The core analysis engine and multi-tenant management service for the Security Audit Platform.

## 🏗️ Internal Architecture

The Agent service acts as a centralized "Intelligence API" that orchestrates various specialized modules:

1.  **Input Adapters**: Normalizes code from diverse sources (Plaintext, File Uploads, or Git Repositories).
2.  **Git Engine**: Uses `simple-git` to securely clone repositories into temporary storage, performing tree-traversal and source code aggregation.
3.  **Security Middleware**: Validates Firebase OIDC tokens and ensures multi-tenant isolation.
4.  **AI Orchestrator**: Interfaces with **Gemini 3.1 Flash**, applying complex system instructions for functional assessment and security auditing.
5.  **Data Layer**: Manages persistent state in **Firestore** and protects secrets in **Google Cloud Secret Manager**.

## 📡 API Endpoints & Flow

### Code Analysis (`POST /api/analyze`)
This is the primary endpoint for both the Bot and the Frontend.
- **Request**: `{ "inputType": "git" | "code", "content": "...", "structured": true|false }`
- **Internal Flow**:
    1.  **Extraction**: If `git`, clones repo and extracts code. If `code`, uses raw content.
    2.  **Analysis**: Sends content to Gemini with the "Security Engineer" persona.
    3.  **Parsing**: Uses `safeJsonParse` to strip Markdown delimiters and return structured JSON (if requested).
- **Response**: `{ "report": "markdown" }` or `{ "summary": "...", "comments": [] }`

### GitHub Management (Authenticated)
- **`GET /api/github/config`**: Fetches user's bot status.
- **`POST /api/github/finalize-setup`**: Handles Manifest code exchange. **(Uses Firestore Transactions)**.
- **`GET /api/github/reviews`**: Retrieves audit history.

## 📦 Deployment (Cloud Run)
```bash
gcloud run deploy security-audit-agent \
  --source . \
  --set-env-vars="GOOGLE_API_KEY=...,GOOGLE_CLOUD_PROJECT=..."
```

## 🛠 Local Development
1. `npm install`
2. Configure `.env` (See [Setup Guide](../docs/github-app-setup.md))
3. `npm run dev`
