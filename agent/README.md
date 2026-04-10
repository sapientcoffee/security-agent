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

## API Endpoints

- **`POST /api/analyze`**: Performs a security analysis on the provided code or Git repository.
  - **Payload**: `{ "inputType": "text" | "git", "content": string }`
  - **Response**: `{ "report": string }` (Markdown-formatted audit report).
- **`GET /agent-card`**: Returns the remote agent configuration for Gemini CLI.
- **`POST /v1/message:send`**: Generic agent message endpoint.

## Architecture & Features

### Git Processing
The agent uses `simple-git` and `glob` to:
1.  **Clone**: Repositories are cloned into a temporary system directory (`os.tmpdir()`).
2.  **Filter**: It automatically ignores binary files, dependencies (`node_modules`), and version control metadata (`.git`).
3.  **Analyze**: All discovered source code files are aggregated into a single context-rich string for analysis by the Gemini model.
4.  **Cleanup**: The temporary directory is recursively deleted after analysis, even in the case of failures.

### AI Integration
The agent is configured to use **Gemini 1.5 Flash** with a specialized system instruction that defines its persona as a "Specialized QA and Security Engineer." This instruction guides the model to perform:
- Functional Assessment
- Bug Hunting
- Detailed Security Audits

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
