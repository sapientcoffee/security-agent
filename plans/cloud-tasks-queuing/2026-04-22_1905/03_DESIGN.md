# Design: Cloud Tasks Queuing for PR Analysis

## Architectural Approach
We will introduce an asynchronous queuing layer using Google Cloud Tasks. Instead of processing PR reviews directly in the webhook handler, the bot will create a Task and return a `202 Accepted` response immediately. Cloud Tasks will then trigger a dedicated endpoint on the bot service to perform the long-running analysis.

## Components

### 1. Cloud Tasks Library (`github-bot/src/lib/tasks.js`)
A utility to interface with the Cloud Tasks API.
- **Function:** `createPRAnalysisTask(payload)`
- **Configuration:** Uses environment variables for project, location, and queue name.
- **OIDC:** Includes an OIDC token in the HTTP request to the target endpoint.

### 2. Task Handler Endpoint (`POST /task/process-pr`)
A new internal-use endpoint in the bot service.
- **Middleware:** `verifyTaskToken` (OIDC verification).
- **Logic:** 
    - Extracts PR details from the request body.
    - Uses `GitHubService` to fetch diff.
    - Calls `analyzeDiff`.
    - Creates GitHub review.
    - Updates Firestore.

### 3. Verification Middleware (`github-bot/src/middleware/auth.js`)
- Reuses the OIDC verification logic from the Agent to ensure that only authorized callers (like Cloud Tasks) can trigger the task handler.
- Checks the `Authorization` header for a valid Google ID token.

## Sequence Diagram
1. **GitHub** -> `POST /webhook` -> **Bot (Webhook Handler)**
2. **Bot** -> `createPRAnalysisTask(payload)` -> **Cloud Tasks API**
3. **Bot** -> `202 Accepted` -> **GitHub**
4. **Cloud Tasks** -> `POST /task/process-pr` -> **Bot (Task Handler)** (Awaited)
5. **Bot (Task Handler)** -> **GitHub API** (Get Diff)
6. **Bot (Task Handler)** -> **Agent API** (Analyze)
7. **Bot (Task Handler)** -> **GitHub API** (Create Review)
8. **Bot (Task Handler)** -> **Firestore** (Log result)
9. **Bot (Task Handler)** -> `200 OK` -> **Cloud Tasks**

## Security
- The `/task/*` routes will be protected by OIDC verification.
- The `TASK_SERVICE_ACCOUNT` must have `iam.serviceAccounts.getAccessToken` and the target Cloud Run service must allow `invoker` permissions if applicable (though we are verifying the token manually in code for simplicity/robustness).
