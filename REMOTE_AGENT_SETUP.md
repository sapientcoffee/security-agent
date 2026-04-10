# Remote Agent Configuration for Gemini CLI

This document explains how to register the **Security Audit Agent** as a remote subagent within the Gemini CLI environment. Remote agents allow you to offload specialized tasks (like security auditing) to a dedicated service.

For more details, refer to the [Gemini CLI Remote Agents Documentation](https://geminicli.com/docs/core/remote-agents/).

## 1. Local Development Configuration (Localhost)

Use this configuration when running the agent locally for testing or development.

Create a file at `.gemini/agents/security-auditor-dev.md`:

```markdown
---
kind: remote
name: security-auditor-dev
agent_card_url: http://localhost:8080/agent-card
---

# Security Auditor (Dev)

Points to `localhost:8080` for testing logic locally before deploying to production.
This agent specializes in identifying security vulnerabilities and functional bugs.
```

## 2. Production Configuration (Google Cloud Run)

Use this configuration once the agent is deployed to Google Cloud Run. This example uses Google's built-in authentication for secure access.

Create a file at `.gemini/agents/security-auditor.md`:

```markdown
---
kind: remote
name: security-auditor
agent_card_url: https://security-audit-agent-300502296392.us-central1.run.app/agent-card
auth:
  type: google-credentials
---

# Security Auditor

This is a remote subagent specialized in security auditing and QA.
It is implemented as a Cloud Run service that uses Google AI Studio (Gemini 1.5 Flash) to analyze code and provide actionable remediation reports.
```

## 💡 How to use the Remote Agent

Once the configuration file is created in your `.gemini/agents/` directory, you can invoke the agent directly from the Gemini CLI:

```bash
# Ask the security auditor to review a specific file
gemini @security-auditor "Review this file for SQL injection vulnerabilities: @{src/db.js}"

# Start a session specifically with the auditor
gemini --agent security-auditor
```

## 🔑 Authentication Note

- **Localhost**: No authentication is required for local testing.
- **Cloud Run**: The `google-credentials` auth type automatically handles ID token generation using your local `gcloud` credentials to securely authenticate with the protected Cloud Run service.
