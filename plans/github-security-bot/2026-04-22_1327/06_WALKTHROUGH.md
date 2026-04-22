# Walkthrough: GitHub Security Review Bot

## 🚀 Overview
The GitHub Security Review Bot is a standalone service designed to automate security audits of Pull Requests. It acts as an orchestrator between GitHub webhooks and the core Security Audit Agent, providing developers with immediate, actionable feedback directly within their PRs.

## 🛠 Architectural Summary
- **Standalone Middleware:** The bot is built as a separate Node.js Express service (`github-bot/`), ensuring the core Security Agent remains agnostic to the code source.
- **Secure Webhooks:** Implements HMAC-SHA256 signature verification to ensure payloads originate exclusively from GitHub.
- **Structured Analysis:** Leverages the updated Core Agent's ability to return structured JSON, allowing the bot to post both a high-level summary and precise inline comments.
- **Octokit Integration:** Uses the official GitHub SDK for robust authentication as a GitHub App and seamless interaction with the REST API.

## 🧪 Verification Evidence

### 1. Automated Integration Tests
The bot includes a comprehensive test suite that simulates the entire lifecycle of a PR review.
```bash
cd github-bot && npm test
```
**Results:**
- `server.test.js`: Verifies health checks, signature verification, and event filtering.
- `github-service.js`: Verifies PR diff retrieval and review posting.
- `integration.test.js`: Simulates a complete flow from webhook reception to review publication.

### 2. Core Agent Structured Output
The Core Agent was updated to support the `structured: true` parameter, enabling the following JSON response:
```json
{
  "summary": "### Security Audit Summary\nIssues found in the authentication module...",
  "comments": [
    {
      "path": "src/auth.js",
      "line": 15,
      "body": "**High Severity:** Use of hardcoded secret detected."
    }
  ]
}
```

## 📖 How to Use locally

### 1. Configure Environment Variables
Create a `.env` file in the `github-bot/` directory:
```env
PORT=3001
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY=your_private_key_pem
GITHUB_WEBHOOK_SECRET=your_webhook_secret
AGENT_API_URL=http://localhost:8080/api/analyze
AGENT_API_TOKEN=your_agent_token
```

### 2. Start the Core Security Agent
```bash
cd agent
npm install
npm start
```

### 3. Start the GitHub Bot
```bash
cd github-bot
npm install
npm start
```

### 4. Configure GitHub App
1. Set the **Webhook URL** to your bot's endpoint (using `smee.io` or `ngrok` for local dev).
2. Enable **Pull Request** events.
3. Grant **Read/Write** permissions for Pull Requests and Repository Content.

## 📦 Containerization
A production-ready Dockerfile is provided to deploy the bot as a containerized service (e.g., on Cloud Run).
```bash
docker build -t github-security-bot ./github-bot
```
