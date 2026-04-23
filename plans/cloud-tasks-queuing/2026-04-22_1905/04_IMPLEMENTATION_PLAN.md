# Implementation Plan: Cloud Tasks Queuing

## Phase 1: Preparation
- [x] Install `@google-cloud/tasks` in `github-bot`.
    - `npm install @google-cloud/tasks` in `github-bot` directory.

## Phase 2: Security & Middleware
- [ ] Create `github-bot/src/middleware/auth.js`.
    - Implement OIDC token verification using `google-auth-library`.
    - Export `verifyTaskToken` middleware.

## Phase 3: Cloud Tasks Integration
- [ ] Create `github-bot/src/lib/tasks.js`.
    - Initialize `CloudTasksClient`.
    - Implement `createPRAnalysisTask(payload)`.
    - Handle OIDC token configuration for the HTTP request.

## Phase 4: Server Refactoring
- [ ] Create Task Handler Endpoint in `github-bot/src/server.js`.
    - Add `app.post('/task/process-pr', verifyTaskToken, ...)`
    - Move logic from `processPromise` to this handler.
- [ ] Refactor Webhook Handler in `github-bot/src/server.js`.
    - Remove `processPromise` block.
    - Call `createPRAnalysisTask()` instead.
    - Ensure necessary data is passed (appId, installationId, owner, repo, etc.).

## Phase 5: Verification & Cleanup
- [ ] Update documentation (README, environment variables).
- [ ] Verify with integration tests if possible.
- [ ] Auditor review of the changes.
