# Research Report: Cloud Tasks Queuing for PR Analysis

## Current Implementation
- **Location:** `github-bot/src/server.js` (lines 243-281).
- **Behavior:** PR analysis is performed in an un-awaited background promise (`processPromise`) within the webhook handler.
- **Trigger:** `pull_request` events with actions `opened`, `synchronize`, or `labeled` with `security-review`.
- **Logic:**
    1. Fetch PR diff using `GitHubService`.
    2. Call `analyzeDiff` (which hits the Agent's `/api/analyze` endpoint).
    3. Create a GitHub review with the results.
    4. Save review history to Firestore.

## Proposed Changes
1. **New Dependency:** Add `@google-cloud/tasks` to `github-bot/package.json`.
2. **New Library:** Create `github-bot/src/lib/tasks.js` to manage Cloud Tasks creation.
3. **New Endpoint:** Add `POST /task/process-pr` to `github-bot/src/server.js`.
4. **Task Security:** Implement OIDC token verification for the `/task/` endpoint.
5. **Webhook Refactor:** Replace `processPromise` with a call to create a Cloud Task.

## Technical Details
- **Cloud Tasks API:** Requires `projectId`, `location`, and `queue` name.
- **OIDC Auth:** Cloud Tasks can be configured to include an OIDC token in the request. The target endpoint should verify this token.
- **Environment Variables needed:**
    - `GOOGLE_CLOUD_PROJECT`
    - `CLOUD_TASKS_LOCATION` (e.g., `us-central1`)
    - `CLOUD_TASKS_QUEUE` (e.g., `pr-analysis-queue`)
    - `BOT_URL` (Base URL of the bot service)
    - `TASK_SERVICE_ACCOUNT` (Service account email for OIDC token)

## Dependencies & Patterns
- The Agent already has a `verifyToken` middleware in `agent/src/middleware/auth.js` that can be used as a reference for OIDC verification.
- `GitHubService` is already well-defined in `github-bot/src/github-service.js`.
- `analyzeDiff` is in `github-bot/src/agent-client.js`.
