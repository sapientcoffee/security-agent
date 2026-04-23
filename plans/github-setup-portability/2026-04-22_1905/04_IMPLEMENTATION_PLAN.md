# Implementation Plan: GitHub Setup Portability and Atomic Updates

## Phase 1: Frontend Portability
- [x] Task 1: Update `frontend/src/components/GitHubSetup.tsx` to derive the webhook URL dynamically.
    - Use `import.meta.env.VITE_API_URL` or `apiClient.defaults.baseURL`.
    - Ensure it handles both absolute and relative URLs correctly.
    - Append `/api/webhook` to the constructed base URL.

## Phase 2: Backend Atomicity
- [x] Task 2: Refactor `agent/src/server.js` to use Firestore transactions in `/api/github/finalize-setup`.
    - Wrap the two `set` operations in `db.runTransaction`.
    - Ensure proper error handling and logging.

## Phase 3: Validation
- [x] Task 3: Verify the changes.
    - Audit code for potential regressions.
    - Check that the webhook URL in the manifest flow is correctly generated.
    - Ensure transactions are correctly implemented.
