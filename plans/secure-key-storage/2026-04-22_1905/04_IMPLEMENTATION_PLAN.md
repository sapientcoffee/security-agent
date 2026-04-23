# Implementation Plan: Secure GitHub App Private Key Storage

## Phase 1: Dependency Updates
- [ ] Add `@google-cloud/secret-manager` to `agent/package.json`.
- [ ] Add `@google-cloud/secret-manager` to `github-bot/package.json`.
- [ ] Run `npm install` in both directories.

## Phase 2: Secret Management Utility
- [ ] Create `agent/src/lib/secrets.js` with `upsertSecret` and `getSecret` functions.
- [ ] Create `github-bot/src/lib/secrets.js` with `getSecret` function. (Could be shared, but current structure seems to have separate `src/lib`).

## Phase 3: Update Agent (Writer)
- [ ] Modify `agent/src/server.js` to use `upsertSecret` when receiving a new GitHub App configuration.
- [ ] Update Firestore `set` call to store `secretName` and `useSecretManager: true` instead of `privateKey`.

## Phase 4: Update Bot (Reader)
- [ ] Modify `github-bot/src/server.js`'s `getAppConfig` to check `useSecretManager` flag.
- [ ] Implement secure retrieval from Secret Manager within `getAppConfig`.
- [ ] Ensure the returned object still has a `privateKey` property containing the PEM content for the caller.

## Phase 5: Verification & Testing
- [ ] (Simulated) Verify that a new app creation stores the key in Secret Manager.
- [ ] (Simulated) Verify that the webhook handler still works by retrieving the key.
- [ ] Verify backward compatibility by ensuring an app without `useSecretManager` still works.
