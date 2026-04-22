# High-Level Design Document: GitHub Security Review Bot

## 1. Architectural Approach
Based on the requirement for a "Standalone Architecture" while keeping future consolidation in mind, we will build a **standalone separate service** for the GitHub Bot. 
* **Why Standalone?** It decouples the GitHub-specific webhook handling, OAuth/App authentication, and GitHub API interactions from the core AI analysis logic residing in the existing Security Agent (`agent/src/server.js`).
* **Interaction:** The new GitHub Bot service will act as a middleware/orchestrator. It will receive webhooks from GitHub, fetch the PR diff, and then make HTTP requests to the existing Security Agent's `POST /api/analyze` endpoint.

## 2. Data Flow
The end-to-end data flow for a PR security review is as follows:
1. **Trigger:** A developer opens or updates a Pull Request on GitHub.
2. **Webhook Event:** GitHub sends a `pull_request` webhook (e.g., action `opened` or `synchronize`) to the Bot Service.
3. **Verification:** The Bot Service verifies the webhook signature (`X-Hub-Signature-256`) to ensure authenticity.
4. **Diff Retrieval:** The Bot Service uses the Octokit SDK to authenticate as the GitHub App installation and fetches the raw PR diff.
5. **Analysis Request:** The Bot Service sends the PR diff to the Security Agent (`POST /api/analyze` with `inputType: 'code'`).
6. **AI Processing:** The Security Agent processes the diff and returns a structured response (summary + line-specific findings).
7. **Feedback Delivery:** The Bot Service parses the agent's response and uses the Octokit SDK to post a comprehensive PR Review containing a summary body and inline comments.

## 3. Component Diagram (Text-Based)

```text
+----------------+          +-------------------------+          +-------------------------+
|                | Webhook  |                         |   REST   |                         |
|   GitHub App   |--------->|   GitHub Bot Service    |--------->|  Core Security Agent    |
|  (Repository)  |          |  (Standalone Node.js)   |          |  (agent/src/server.js)  |
|                |<---------|                         |<---------|                         |
+----------------+ API Call +-------------------------+ JSON Res +-------------------------+
       ^                           |    ^
       |     Auth (Octokit)        |    |
       +---------------------------+----+
```

## 4. Security
* **Webhook Verification:** The Bot Service must use `express.raw()` middleware for the webhook route to capture the raw payload. It will calculate the HMAC-SHA256 signature using the `GITHUB_WEBHOOK_SECRET` and compare it against the `X-Hub-Signature-256` header to ensure the payload originated from GitHub.
* **Secret Management:** 
  * `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY` (RSA PEM), and `GITHUB_WEBHOOK_SECRET` will be injected at runtime securely via environment variables (e.g., via Google Cloud Secret Manager if deployed to Cloud Run).
  * The Private Key will be used by Octokit to generate short-lived Installation Access Tokens (JWTs) for API interactions, ensuring least-privilege access and automatic rotation.

## 5. Structured Output Strategy
To fulfill the requirement of providing both a high-level summary and line-specific inline comments, the AI agent needs to return parseable data, not just plain Markdown.
* **Prompt Engineering:** We will modify the prompt sent to the core Security Agent (or wrap it in the Bot Service) to enforce a strict JSON output schema using Generative AI structured outputs (e.g. `response_mime_type: "application/json"`).
* **JSON Schema:**
  ```json
  {
    "summary": "High-level markdown summary of the security posture...",
    "comments": [
      {
        "path": "src/auth.js",
        "line": 42,
        "body": "Markdown comment detailing the specific vulnerability..."
      }
    ]
  }
  ```
* **Integration:** The Bot Service will parse this JSON response. It will use the `summary` field for the main PR review body and map the `comments` array to the GitHub API's inline comments format.

## 6. Future-proofing & Centralized API Support
* **Modular Design:** By keeping the GitHub Bot separate from the Core Security Agent, the Core Agent remains agnostic to the source of the code (GitHub, GitLab, local CLI, etc.). 
* **Interface Abstraction:** The Bot Service will implement a standardized internal interface for "Review Adapters." When the organization moves to a Centralized Review API, the GitHub webhook handling can easily be folded into a centralized gateway API, while the business logic of mapping Git payloads to AI prompts remains completely reusable.
* **Statelessness:** Both the Bot Service and the Core Agent will remain stateless, allowing them to be scaled independently (e.g., on Cloud Run) based on webhook volume or analysis complexity.
