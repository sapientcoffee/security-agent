# Requirements: Enhance Web UI with real-time progress and better report visualization

## Objective
Improve the React frontend of the Security Agent by adding real-time progress feedback, syntax highlighting in audit reports, interactive remediation snippets, and an audit history sidebar.

## User Stories
- **As a developer**, I want to see granular progress (Cloning, Parsing, Analyzing) during a repository audit, so that I know exactly what stage the process is in.
- **As a security auditor**, I want syntax highlighting in the audit reports, so that I can easily read and review suggested code changes.
- **As a developer**, I want a 'Copy Fix' button on remediation snippets, so that I can quickly apply security patches.
- **As a user**, I want a history sidebar to view my previous audits, so that I can track security improvements over time.

## Constraints & Business Rules
- The solution must be integrated into the existing React frontend.
- Audit history should initially be stored in LocalStorage for simplicity.
- The UI should remain clean and professional.
- Design for future migration of audit history to Firestore.

## Technical Scope
- **Real-time Progress:** Implement or verify a mechanism (socket/polling) to communicate analysis progress (Cloning, Parsing, Analyzing) from backend to frontend.
- **Syntax Highlighting:** Integrate a code-highlighting library (e.g., prismjs, highlight.js) into the markdown renderer.
- **Interactive UI:** Implement a progress-stepper component and a 'Copy to Clipboard' utility for remediation snippets.
- **Persistence:** Create a History Sidebar component with LocalStorage persistence, structured to allow future Firestore integration.
