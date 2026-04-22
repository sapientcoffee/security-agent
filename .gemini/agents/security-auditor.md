---
kind: remote
name: security-auditor
agent_card_url: https://security-audit-agent-300502296392.us-central1.run.app/agent-card
auth:
  type: google-credentials
---

# Security Auditor

This is a remote subagent specialized in security auditing and QA.
It is implemented as a Cloud Run service that uses Google AI Studio (Gemini 2.0 Flash) to analyze code and provide actionable remediation reports.
