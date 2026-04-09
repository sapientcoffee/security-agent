# Security Audit Remote Agent

This is a remote subagent for Gemini CLI that performs security audits and QA checks. It uses **Google AI Studio** for low-latency, simple alternative testing.

## Deployment to Google Cloud Run

1.  **Build and Push the Container**:
    Use Cloud Build to build and push the container to Artifact Registry or GCR.
    ```bash
    gcloud builds submit --tag gcr.io/[YOUR_PROJECT_ID]/security-audit-agent .
    ```

2.  **Deploy to Cloud Run**:
    Ensure you have a `GOOGLE_API_KEY` from [Google AI Studio](https://aistudio.google.com/app/apikey).
    ```bash
    gcloud run deploy security-audit-agent \
      --image gcr.io/[YOUR_PROJECT_ID]/security-audit-agent \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --set-env-vars GOOGLE_API_KEY=[YOUR_API_KEY]
    ```

3.  **Register the Remote Agent in Gemini CLI**:
    Create or update your `.gemini/agents/security-auditor.md` with the Cloud Run URL.

    ```markdown
    ---
    kind: remote
    name: security-auditor
    agent_card_url: https://[YOUR_CLOUD_RUN_URL]/agent-card
    auth:
      type: none # Authentication to AI Studio is handled internally via API Key
    ---
    ```

## Local Development

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Configure Environment:
    Create a `.env` file in the project root directory:
    ```
    GOOGLE_API_KEY=your_api_key_here
    PORT=8080
    ```

3.  Run the server:
    ```bash
    npm run dev
    ```

4.  Test the agent-card endpoint:
    ```bash
    curl http://localhost:8080/agent-card
    ```
