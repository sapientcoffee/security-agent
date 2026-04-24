# Implementation Plan: Migrate AI Orchestration to Google Agent Development Kit (ADK)

## 📋 Micro-Step Checklist
- [ ] Phase 1: Preparation
  - [x] Step 1.A: Install `@google/adk` and OpenTelemetry dependencies in the `agent` workspace.
- [ ] Phase 2: Infrastructure
  - [x] Step 2.A: Create telemetry bootstrap verification harness.
  - [x] Step 2.B: Implement the telemetry bootstrap module and hook it into `server.js`.
- [ ] Phase 3: Refactoring Provider Logic
  - [ ] Step 3.A: Update `llm-provider.test.js` to assert `LlmAgent` usage.
  - [ ] Step 3.B: Refactor `llm-provider.js` to initialize and return the ADK `LlmAgent`.
- [ ] Phase 4: Integration
  - [ ] Step 4.A: Update `server.test.js` mocks for the new ADK response signatures.
  - [ ] Step 4.B: Update Express endpoints (`/api/analyze` and `/v1/message:send`) in `server.js` to use ADK execution models.
- [ ] Phase 5: Validation
  - [ ] Step 5.A: Verify OpenTelemetry trace export and run the full test suite.

## 📝 Step-by-Step Implementation Details

### Phase 1: Preparation
#### Step 1.A (Install Dependencies):
*   *Target Directory:* `agent/`
*   *Instructions:* Run the following command to install the ADK and OpenTelemetry peer dependencies: 
    `npm install @google/adk @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node`
*   *Verification:* Check `package.json` to ensure the new packages are present.

### Phase 2: Infrastructure
#### Step 2.A (The Verification Harness):
*   *Target File:* `agent/tests/telemetry.test.js` (New File)
*   *Verification:* Write explicit assertions to ensure `initTelemetry` correctly calls ADK's telemetry methods (`maybeSetOtelProviders`, `getGcpExporters`) before writing the implementation (Red).

#### Step 2.B (The Core Change):
*   *Target File:* `agent/src/lib/telemetry.js` (New File) & `agent/src/server.js`
*   *Instructions:* 
    1. Create `agent/src/lib/telemetry.js`. Export an `initTelemetry()` function that uses `@google/adk` to bootstrap Cloud Trace (via `maybeSetOtelProviders` and `getGcpExporters`).
    2. In `agent/src/server.js`, import and invoke `initTelemetry()` at the very top of the file, *before* importing Express or other business logic.
*   *Verification:* Run `npm run test -- telemetry.test.js`.

### Phase 3: Refactoring Provider Logic
#### Step 3.A (The Verification Harness):
*   *Target File:* `agent/tests/llm-provider.test.js`
*   *Verification:* Update the tests to replace `@google/generative-ai` and `@google-cloud/vertexai` mocks with `@google/adk` mocks. Assert that the `LlmAgent` is properly constructed with the `instruction` property and the right model configuration.

#### Step 3.B (The Core Change):
*   *Target File:* `agent/src/lib/llm-provider.js`
*   *Instructions:* 
    1. Remove the direct usage of `VertexAI` and `GoogleGenerativeAI`.
    2. Import `LlmAgent` from `@google/adk`.
    3. Update `getLLMModel(systemInstruction, generationConfig)` (consider renaming to `getSecurityAgent`) to wrap the logic in an `LlmAgent` instance.
    4. Pass the system instruction natively via the `instruction` parameter on the `LlmAgent` constructor.
    5. Cache and return the `LlmAgent` instance instead of the raw generative model.
*   *Verification:* Run `npm run test -- llm-provider.test.js`.

### Phase 4: Integration
#### Step 4.A (The Verification Harness):
*   *Target File:* `agent/tests/server.test.js`
*   *Verification:* Ensure server integration tests are mocking the new ADK execution signatures (e.g., `agent.runAsync()` or ADK's specific streaming implementation) instead of `generateContent()` or `generateContentStream()`.

#### Step 4.B (The Core Change):
*   *Target File:* `agent/src/server.js`
*   *Instructions:* 
    1. **Streaming Endpoint (`/api/analyze`):** Replace `model.generateContent()` with the ADK's `LlmAgent` invocation. Ensure the streaming chunks from the ADK orchestrator are properly intercepted and mapped to the SSE `res.write` events.
    2. **Message Endpoint (`/v1/message:send`):** Update the call to use the ADK agent. Extract the final text from the ADK response object and map it to the existing A2A schema for Gemini CLI.
*   *Verification:* Run `npm run test -- server.test.js`.

### Phase 5: Validation
#### Step 5.A (End-to-End Validation):
*   *Target Files:* All tests
*   *Instructions:* Run the entire vitest suite to ensure no regressions were introduced.
*   *Verification:* Exact command to run: `npm run test`. Ensure all tests pass (Green).