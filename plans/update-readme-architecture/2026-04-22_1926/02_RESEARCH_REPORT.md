# Research Report: README Architecture Update

## Current State Analysis

### Services & Layers
- **User Layer (Client-side)**:
  - **Web Frontend**: React-based dashboard for manual audits and management.
  - **GeminiCLI (New)**: Command-line interface for terminal-based security auditing.
- **Automation Layer**:
  - **GitHub Bot**: Webhook listener for PR events, managing tasks via Cloud Tasks.
- **Intelligence Layer (Server-side)**:
  - **Backend Agent**: Node.js/Express service on Cloud Run. Orchestrates analysis, manages Firestore/Secret Manager, and interfaces with Gemini.
  - **Remote Subagent Bridge**: GeminiCLI connects to the `security-auditor` remote subagent, which acts as a client wrapper for the Backend Agent.
- **Foundation Layer**:
  - **Gemini 3.1 Flash / 2.0 Flash**: AI models providing the logic.
  - **Firestore**: State and multi-tenant configuration.
  - **Secret Manager**: Secure storage for GitHub keys.
  - **Cloud Tasks**: Reliable queue for long-running audits.

### Remote Subagent Details
- **Configuration**: `.gemini/agents/security-auditor.md`
- **URL**: `https://security-audit-agent-300502296392.us-central1.run.app`
- **Mechanism**: GeminiCLI dispatches tasks to the `security-auditor` (remote), which sends requests to the Backend Agent's analysis endpoints.

### Visual Style Requirements
The existing diagram (`a_technical_architecture_diagram.png`) uses a "professional and futuristic" style. The new diagram should maintain this aesthetic while adding:
1.  A box for **GeminiCLI** next to the **Web Frontend**.
2.  A connection from **GeminiCLI** to a **Remote Subagent** node.
3.  A connection from the **Remote Subagent** to the **Backend Agent**.
4.  Standard connections for GitHub PRs to the **GitHub Bot**.

## Technical Grounding
- **Gemini Remote Subagents**: Documentation confirms that `kind: remote` agents use a standard API (like Agent Card) to allow the Gemini CLI to delegate tasks to external services.
- **Agent Architecture**: The Backend Agent is already configured to handle these requests via its `/api/analyze` and agent-specific endpoints.
