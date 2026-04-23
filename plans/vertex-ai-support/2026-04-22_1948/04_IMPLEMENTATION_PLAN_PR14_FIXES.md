# Implementation Plan: PR #14 Code Review Fixes

## Objective
Address feedback from `gemini-code-assist` on PR #14 regarding redundant validation, hardcoded logging, and missing singleton patterns for SDK clients.

## 📋 Micro-Step Checklist
- [ ] Step 1: Update `agent/src/lib/llm-provider.js`
  - [ ] Implement singleton caching for `VertexAI` and `GoogleGenerativeAI` instances.
  - [ ] Add explicit validation for `VERTEX_PROJECT` when `USE_VERTEX_AI === "true"`.
- [ ] Step 2: Update `agent/tests/llm-provider.test.js`
  - [ ] Update tests to verify `VERTEX_PROJECT` error handling.
  - [ ] Reset singletons between tests to avoid state leakage.
- [ ] Step 3: Update `agent/src/server.js`
  - [ ] Remove redundant `if (!API_KEY)` checks around line 123 and 193.
  - [ ] Update log messages to be provider-agnostic or retrieve provider name from a helper.
- [ ] Step 4: Verify End-to-End
  - [ ] Run `npm run test` in `agent/`.
  - [ ] Run `npm run lint` in `agent/`.

## 📝 Step-by-Step Implementation Details

### Step 1: Update `llm-provider.js`
*   *Target File:* `agent/src/lib/llm-provider.js`
*   *Instructions:*
    *   Introduce module-level variables `let vertexClientInstance = null;` and `let genAIClientInstance = null;`.
    *   If `USE_VERTEX_AI`, check for `VERTEX_PROJECT`. If missing, `throw new Error("VERTEX_PROJECT is required for Vertex AI provider.");`.
    *   If `USE_VERTEX_AI`, initialize `vertexClientInstance` only if it is null. Return `vertexClientInstance.getGenerativeModel(...)`.
    *   Else, initialize `genAIClientInstance` only if it is null. Return `genAIClientInstance.getGenerativeModel(...)`.
    *   Add an exported `resetClientsForTesting()` function to clear the singletons during tests.

### Step 2: Update Tests
*   *Target File:* `agent/tests/llm-provider.test.js`
*   *Instructions:*
    *   Import `resetClientsForTesting` and call it in `afterEach`.
    *   Add a test block in the Vertex AI suite: "should throw an error if VERTEX_PROJECT is missing".

### Step 3: Update Server
*   *Target File:* `agent/src/server.js`
*   *Instructions:*
    *   Find the `if (!API_KEY) { return res.status(500)... }` blocks inside `/api/analyze` and `/v1/message:send` and remove them.
    *   Update log messages like `logger.info("Initializing Google AI Studio...");` to simply state `logger.info("Initializing LLM Provider...");`.
