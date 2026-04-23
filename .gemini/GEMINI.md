<!-- NOTE: This file is always loaded into context, no matter what you are trying to do! You should ensure that its contents are as universally applicable as possible.-->

<!-- Top Tips
An LLM will perform better on a task when its' context window is full of focused, relevant context including examples, related files, tool calls, and tool results compared to when its context window has a lot of irrelevant context.

* ~60 lines no more than 600 (channel your inner minimalist; less is more)
* If the info is somewhere in the codebase you probably don't need it to be here - Really good at figuring out what files/folders matter for tasks, what commands to run, the dependencies you have
* Use it to steer the model away from things its consistently doing wrong or quirks that keep happening
* Include bash commands that can't be guesses by the model
* Exclude information that changes frequently
* Include unique instructions or team etiquette (branch naming, PR conventions)
* Consider what the model can workout and what it can't (and will) work out by reviewing the codebase; reduce the risk of confusing it -->

# Project: Security Audit Agent
<!-- agents operate best on rigid, operational guardrails and specific constraints rather than polite requests or general guidelines. Stick to concrete "Do X, Never do Y" statements. -->
This file describes common mistakes and confusion points that agents might encounter as they work in this project.

## Deployment Workflow
- **Secrets:** Store `GOOGLE_API_KEY` in Secret Manager.
- **Backend (Agent):** Deploy first to obtain URL. Use `gcloud run deploy security-audit-agent --source ./agent --set-secrets GOOGLE_API_KEY=GOOGLE_API_KEY:latest --set-env-vars GOOGLE_CLOUD_PROJECT=...`
- **GitHub Bot:** Deploy second. Use `gcloud builds submit` then `gcloud run deploy` with `AGENT_API_URL` and `AGENT_API_TOKEN`.
- **Frontend (UI):** Build with `gcloud builds submit` to bake in `VITE_API_URL`.

## Architecture & Multi-Tenancy
- **Firestore Schema:** 
  - `github_apps/{appId}`: Multi-tenant bot credentials.
  - `github_reviews/`: Audit history logs.
- **Trace Correlation:** Use `AsyncLocalStorage` and `X-Cloud-Trace-Context` header to link Bot -> Agent logs.

## Setup & Developer Environment
- **Install:** `npm install` (No pnpm/yarn)
- **Firebase:** Requires project with Firestore enabled.
- **Auth:** Uses Firebase Auth (Frontend) and Cloud Identity tokens (Backend).

## Deep Context (Progressive Disclosure)
<!-- The Gemini CLI executes a downward Breadth-First-Search (BFS) scan through your project, grabbing context files from subdirectories (up to a limit of 200 folders) and layering them over the root file. Ensure this root file remains strictly for global mandates, and rely heavily on nested GEMINI.md files in your sub-folders for component-specific instructions, as those will be appended closer to the active user prompt  -->
- **Project Documentation:** `@docs/**`
- **GitHub App Setup:** `@docs/github-app-setup.md`
- **Agentic Testing Specs:** `@docs/agentic-testing.md`
- **Backend API Logic:** `@./server.js`

## Deep Context (Progressive Disclosure)
<!-- The Gemini CLI executes a downward Breadth-First-Search (BFS) scan through your project, grabbing context files from subdirectories (up to a limit of 200 folders) and layering them over the root file. Ensure this root file remains strictly for global mandates, and rely heavily on nested GEMINI.md files in your sub-folders for component-specific instructions, as those will be appended closer to the active user prompt  -->
- **Frontend App Entry:** `@./src/App.jsx`
- **Authentication Flows:** `@./src/auth/AGENTS.md`

## Rules, Gotchas, & Anti-Patterns
<!-- For comparative data or strict rule matrices, structural analysis shows that formatting these rules into a Markdown table or using YAML/XML structures significantly improves the model's comprehension and token ingestion efficiency compared to plain prose or basic lists -->
<!-- Specify prefered process and specific instructions to be followed -->
| Category | Mandate | Anti-Pattern to Avoid |
| :--- | :--- | :--- |
| **Error Handling** | Use `asyncHandler` in `server.js` and throw errors with a `.status` property. | Never use generic `try/catch` blocks that swallow errors or omit status codes. |
| **SDK Usage** | Always use `@google-cloud/workstations` client via `getUserScopedClient(req)`. | Do not instantiate the client manually without proper user-scoped auth. |
| **Testing** | Use the Service Account Token Injection Bypass for E2E tests. Requires `VITE_ENABLE_AUTH_BYPASS="true"` and `localStorage` injection. | Never attempt to automate login through the Google UI or Firebase emulators. |
| **Commits** | Use format: `feat(<feature-name>): <task summary>` | Committing without running `npm run lint` and `npm run test:e2e`. |
| **Comments** | Never remove a comment unless it is specific to the changes you are making. | Deleting original comments or instructions while refactoring. |
| **Deployment** | Always use `gcloud builds submit` with substitutions for the frontend to ensure env vars are baked in. | Never deploy the frontend from source using `gcloud run deploy --source` as build-args will be ignored. |
