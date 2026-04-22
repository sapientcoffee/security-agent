# Agentic Testing Specifications

This document outlines the requirements and processes for testing the Security Audit Agent and its frontend.

## 1. Unit Testing
- **Agent**: Use `vitest` for server-side logic and Git processing utilities.
- **Frontend**: Use `vitest` with React Testing Library for component-level validation.

## 2. E2E Testing
E2E tests ensure the entire flow from code submission to report generation is functional.
- **Setup**: Requires `TEST_SA_KEY_PATH` or `.keys/test-sa.json`.
- **Bypass**: Use the Service Account Token Injection Bypass to avoid manual Google UI interactions.
  - Set `VITE_ENABLE_AUTH_BYPASS="true"` in `frontend/.env`.
  - Inject a valid identity token (e.g., from `gcloud auth print-identity-token`) into `localStorage.setItem('E2E_BYPASS_TOKEN', '<token>')`.
- **Command**: `npm run test:e2e` (to be implemented in root package.json).

## 3. Security Auditing (Dogfooding)
The agent should be capable of auditing its own source code for:
- Improper use of `eval()` or dangerous system calls.
- Insecure handling of Git clones (e.g., path traversal).
- Leakage of API keys in logs.
