---
name: chaos-mitigation
description: Detects, analyzes, and mitigates active chaos events in the `press-service` using logs and runbooks.
---

# Chaos Mitigation Skill

## Overview
This skill instructs the agent on how to detect, analyze, and mitigate active chaos events in the `press-service`.

## Instructions
When the user asks you to "mitigate chaos", "stop the chaos", or you detect an active chaos state:

1.  **Analyze Logs**:
    *   Use the `mcp_observability_list_log_entries` tool to fetch recent logs.
    *   Look for the `press-service` emitting error patterns like `"fluxcapacity not fluxing"` or `"1.21 GIGGAWATS REQUIRED!"`.
    *   Confirm that the system is indeed in a degraded chaos state.

2.  **Read Runbook**:
    *   The mitigation instructions are documented in a Google Doc.
    *   Use the `mcp_google-workspace_drive.search` tool to find the document with the name `chaos-mitigation-runbook` in the `runtime` folder.
    *   Use the `mcp_google-workspace_docs.getText` tool to read the contents of the runbook.

3.  **Execute Mitigation**:
    *   Follow the mitigation steps provided in the runbook.
    *   You will typically need to call the `DELETE /chaos` endpoint on the `press-service`.
    *   You can do this by using the `run_shell_command` tool to execute `curl -X DELETE http://localhost:8081/chaos` (or the equivalent deployed service URL).

4.  **Verify**:
    *   Check the logs again or rely on the UI updating to confirm the system state is restored.
