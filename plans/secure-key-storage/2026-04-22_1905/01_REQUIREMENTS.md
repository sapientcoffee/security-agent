# Requirements: Secure GitHub App Private Key Storage

## Objective
The current implementation stores the GitHub App `privateKey` (PEM) in plaintext within Firestore. This is a security risk. The goal is to migrate this storage to Google Cloud Secret Manager.

## User Stories
- **Secure Storage:** As a system, when a new GitHub App is created/configured, its private key should be stored in Secret Manager.
- **Secure Retrieval:** As the GitHub Bot, when processing a webhook, I should retrieve the private key from Secret Manager using a reference stored in Firestore.
- **Multi-tenant Support:** Each GitHub App should have its own secret or secret version in Secret Manager.

## Constraints
- Use Google Cloud Secret Manager (`@google-cloud/secret-manager`).
- Firestore should only store the secret name/reference, not the PEM content.
- `getAppConfig` logic must be updated to handle this secure retrieval.
- Maintain backward compatibility if possible, or migrate existing keys.

## Success Criteria
- [ ] `privateKey` is no longer stored in plaintext in Firestore for new apps.
- [ ] `github-bot` successfully authenticates with GitHub using keys from Secret Manager.
- [ ] Code is modular and handles Secret Manager errors gracefully.
