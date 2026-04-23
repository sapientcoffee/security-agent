# Security Audit Remote Agent

The core analysis engine of the Security Audit Platform. This service processes code, performs security audits using Gemini, and manages multi-tenant configuration in Firestore.

## 🚀 Key Features
- **AI-Powered Audits:** Uses **Gemini 3.1 Flash** for functional and security reviews.
- **Multi-Tenant:** Securely stores and retrieves user-specific GitHub App configurations.
- **Git Integration:** Clones and traverses repositories to aggregate source code for analysis.
- **History Tracking:** Stores a searchable history of GitHub PR reviews.

## 📡 API Endpoints

### Core Analysis
- **`POST /api/analyze`**: Performs a security analysis.
  - **Payload**: `{ "inputType": "text" | "git", "content": string }`
  - **Response**: `{ "report": string }`

### GitHub Integration (Authenticated)
- **`GET /api/github/config`**: Retrieves the user's current GitHub App status.
- **`POST /api/github/finalize-setup`**: Exchanges a GitHub Manifest code for credentials.
- **`GET /api/github/reviews`**: Fetches the user's history of automated reviews.
- **`DELETE /api/github/config`**: Securely deletes the user's integration and history.

## 📦 Deployment (Cloud Run)

1.  **Build and Push**:
    ```bash
    gcloud builds submit --tag gcr.io/[PROJECT_ID]/security-audit-agent .
    ```

2.  **Deploy**:
    ```bash
    gcloud run deploy security-audit-agent \
      --image gcr.io/[PROJECT_ID]/security-audit-agent \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --set-env-vars GOOGLE_API_KEY=[YOUR_API_KEY],GOOGLE_CLOUD_PROJECT=[YOUR_PROJECT_ID]
    ```

## 🛠 Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Create a `.env` file in `/agent`:
   ```env
   GOOGLE_API_KEY=your_key
   GOOGLE_CLOUD_PROJECT=your_project_id
   PORT=8080
   ```

3. **Run Server**:
   ```bash
   npm run dev
   ```

## 🧠 Architecture

The agent uses a combination of **Firebase Admin SDK** for database operations and **Google Cloud Identity** for secure request validation. It is designed to be stateless and scales horizontally on Cloud Run.
