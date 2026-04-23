# Requirements: GitHub Setup Portability and Atomic Updates

## Objective
Fix portability issues in the GitHub App setup flow and ensure data consistency in Firestore updates.

## User Stories
- As a developer, I want the GitHub App setup flow to work across different environments (local, staging, production) without manual code changes to URLs.
- As a system, I want user-app linkage in Firestore to be atomic to prevent partial updates and data inconsistency.

## Requirements
1. **Dynamic Webhook URL:**
   - In `frontend/src/components/GitHubSetup.tsx`, remove the hardcoded webhook URL.
   - The URL should either be fetched from the backend or derived from the current origin.
   - If derived from origin, it should point to the appropriate backend endpoint.

2. **Atomic Firestore Updates:**
   - Implement Firestore transactions for updating the linkage between users and GitHub Apps.
   - Ensure that if any part of the update fails, the entire operation is rolled back.

3. **Code Quality:**
   - Maintain existing patterns and styles.
   - Ensure the solution is robust and handles errors gracefully.

## Constraints
- Do not break existing GitHub App setup functionality.
- Use Firebase/Firestore SDK best practices for transactions.
