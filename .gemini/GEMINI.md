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

# Project: Workstation Portal
<!-- agents operate best on rigid, operational guardrails and specific constraints rather than polite requests or general guidelines. Stick to concrete "Do X, Never do Y" statements. -->
This file describes common mistakes and confusion points that agents might encounter as they work in this project. If you ever encounter something in the project that surprises you please alert the developer working with you and indicate that this is the case in GEMINI.MD file to help prevent future agents from having the same issue

## Setup & Developer Environment
<!-- Gemini will work out dependencies from the codebase (e.g. package.json). Hardcoding in here is like having stale docs -->
- **Install:** `npm install` (Do NOT use pnpm or yarn)
- **Start Backend:** `node server.js`
- **Start Frontend:** `npm run dev`
- **Keys:** Requires `TEST_SA_KEY_PATH` or `.keys/test-sa.json` for E2E testing (see `docs/local-testing.md`).

## Deep Context (Progressive Disclosure)
<!-- The Gemini CLI executes a downward Breadth-First-Search (BFS) scan through your project, grabbing context files from subdirectories (up to a limit of 200 folders) and layering them over the root file. Ensure this root file remains strictly for global mandates, and rely heavily on nested GEMINI.md files in your sub-folders for component-specific instructions, as those will be appended closer to the active user prompt  -->
- **Project Documentation:** `@docs/**`
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
| **Testing** | Use the Service Account Token Injection Bypass for E2E tests. | Never attempt to automate login through the Google UI or Firebase emulators. |
| **Commits** | Use format: `feat(<feature-name>): <task summary>` | Committing without running `npm run lint` and `npm run test:e2e`. |
| **Comments** | Never remove a comment unless it is specific to the changes you are making. | Deleting original comments or instructions while refactoring. |
