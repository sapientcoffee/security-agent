# Research Report: GitHub Security Review Bot

## Existing Security Agent Analysis
- **Location:** `agent/src/server.js`
- **Core Interface:** `POST /api/analyze`
  - **Request Body:** `{ inputType: 'git' | 'code', content: string }`
    - If `inputType` is `'git'`, `content` is a repository URL.
    - If `inputType` is `'code'`, `content` is the raw source code.
  - **Response:** `{ report: string }` (Markdown format).
- **Processing Logic:** 
  - For Git repos, it clones to a temp directory, globs files, and concatenates them for analysis.
  - For code, it analyzes the string directly.
- **Dependencies:** `express`, `simple-git`, `@google/generative-ai`, `winston`.

## GitHub App Technical Requirements

### 1. Webhook Management
- **Security:** Use `X-Hub-Signature-256` header for payload verification.
- **Verification Logic:** HMAC-SHA256 of raw request body using the App Secret.
- **Payload Capture:** Requires raw body access (e.g., `express.raw()`) before JSON parsing.

### 2. Authentication Flow
- **App Identity:** Authenticate using App ID and Private Key (RSA) to generate a JWT.
- **Installation Identity:** Exchange JWT for an Installation Access Token via `POST /app/installations/{id}/access_tokens`.
- **SDK:** Official `octokit` SDK manages this lifecycle automatically.

### 3. Pull Request Interaction
- **Retrieving Diff:** 
  - `GET /repos/{owner}/{repo}/pulls/{pull_number}`
  - Header: `Accept: application/vnd.github.diff`
  - Response: Raw text diff.
- **Posting Reviews:**
  - `POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews`
  - Payload supports:
    - `body`: High-level summary (Markdown).
    - `event`: `COMMENT`, `REQUEST_CHANGES`, or `APPROVE`.
    - `comments`: Array of `{ path, line, side, body }` for inline feedback.

## Implementation Patterns & Recommendations
- **Libraries:** Install `octokit` (all-in-one SDK) for authentication and API calls.
- **Server:** Extend `agent/src/server.js` or create a new dedicated service (e.g., `github-bot/`) to handle webhooks.
- **Environment:** Requires `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, and `GITHUB_WEBHOOK_SECRET` environment variables.
- **Diff Parsing:** To provide inline comments, the agent's output must be parsed to extract file paths and line numbers, or the agent must be instructed to return a structured format (JSON) in addition to the markdown report.
