# Implementation Plan: Fix AI JSON Parsing

## Tasks
- [ ] Create `agent/src/utils/ai-utils.js` with `stripMarkdown` function.
- [ ] Update `agent/src/server.js` to use `stripMarkdown`.
- [ ] Create `github-bot/src/utils/ai-utils.js` with `stripMarkdown` function.
- [ ] Update `github-bot/src/agent-client.js` to use `stripMarkdown` (as a precaution).
- [ ] Add unit tests for `stripMarkdown` in `agent`.
- [ ] Add unit tests for `stripMarkdown` in `github-bot`.
- [ ] Verify the changes.

## Step-by-Step

### Step 1: Agent Utility
- Create `agent/src/utils/ai-utils.js`.
- Add the `stripMarkdown` function.

### Step 2: Agent Integration
- In `agent/src/server.js`, import `stripMarkdown`.
- Find the `JSON.parse(output)` call.
- Change it to `JSON.parse(stripMarkdown(output))`.

### Step 3: GitHub Bot Utility
- Create `github-bot/src/utils/ai-utils.js`.
- Add the `stripMarkdown` function.

### Step 4: GitHub Bot Integration
- In `github-bot/src/agent-client.js`, import `stripMarkdown`.
- Apply it to the response data if it's a string that needs parsing (though `response.json()` usually handles it, we might want it if we ever use `response.text()`).
- Actually, the user asked to apply it "where AI responses are handled". In the bot, `analyzeDiff` gets the result from the Agent. If the Agent returns JSON, the Bot's `response.json()` is fine.
- I will check if there's any other place in the Bot that handles raw AI strings.

### Step 5: Verification
- Run tests if available.
- Manual check of the code logic.
