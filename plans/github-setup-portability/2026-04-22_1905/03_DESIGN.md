# Design: GitHub Setup Portability and Atomic Updates

## Architectural Approach

### 1. Dynamic Webhook URL Calculation
In the frontend, we will derive the GitHub App webhook URL from the backend's base URL. 
Since `apiClient` already has the base URL configured, we can use it to construct the webhook URL. 
If the base URL is relative (like `/`), we can use `window.location.origin` as the base.

Proposed solution:
- Update `frontend/src/components/GitHubSetup.tsx` to use `apiClient.defaults.baseURL` or `import.meta.env.VITE_API_URL`.
- Fallback to `window.location.origin` if the base URL is relative.
- Append `/api/webhook` to the base URL.

### 2. Atomic Firestore Updates (Transactions)
In the backend, the `/api/github/finalize-setup` endpoint currently performs two separate writes to Firestore. 
These should be wrapped in a transaction to ensure atomicity.

Proposed solution:
- Use `db.runTransaction` in `agent/src/server.js`.
- Inside the transaction:
  1. Set the GitHub App document in the `github_apps` collection.
  2. Update the user document in the `users` collection to link it to the new `githubAppId`.

## Components Involved
- `frontend/src/components/GitHubSetup.tsx`: Frontend UI for GitHub App setup.
- `agent/src/server.js`: Backend API for finalizing setup and handling Firestore linkage.
- `frontend/src/api/axios.ts`: Axios client configuration.

## Data Consistency
By using Firestore transactions, we ensure that:
- A GitHub App is never stored without being linked to a user.
- A user is never linked to a non-existent GitHub App document.
- If either write fails, neither change is committed.
