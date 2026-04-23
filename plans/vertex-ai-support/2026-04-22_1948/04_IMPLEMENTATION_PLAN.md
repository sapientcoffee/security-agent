# Implementation Plan: Vertex AI Support

## 📋 Micro-Step Checklist
- [x] Phase 1: Preparation & Dependencies
  - [x] Step 1.A: Install Vertex AI SDK
- [x] Phase 2: Provider Implementation
  - [x] Step 2.A: Implement `getLLMModel` logic
  - [x] Step 2.B: Write unit tests for Provider

- [x] Phase 3: Refactor Server
  - [x] Step 3.A: Integrate `llm-provider.js` into `server.js`
  - [x] Step 3.B: Verify End-to-End Functionality


## 📝 Step-by-Step Implementation Details

### Phase 1: Preparation & Dependencies
#### Step 1.A (The Core Change): Install Vertex AI SDK
*   *Target File:* `agent/package.json`
*   *Instructions:* Install the `@google-cloud/vertexai` package as a regular dependency.
*   *Verification:* Run `cd agent && npm install @google-cloud/vertexai --save`

### Phase 2: Provider Implementation
#### Step 2.B (The Verification Harness): Write unit tests for Provider
*   *Target File:* `agent/tests/llm-provider.test.js`
*   *Verification:*
    *   Write explicit assertions to verify that setting `USE_VERTEX_AI='true'` successfully instantiates the Vertex AI mock and passes the correct config (`process.env.VERTEX_PROJECT` and `process.env.VERTEX_LOCATION`).
    *   Write explicit assertions to verify the fallback to AI Studio when `USE_VERTEX_AI` is unset or false, ensuring it uses `process.env.GOOGLE_API_KEY`.
    *   Run explicitly: `cd agent && npm test` to watch them fail initially (Red).

#### Step 2.A (The Core Change): Implement `getLLMModel` logic
*   *Target File:* `agent/src/lib/llm-provider.js`
*   *Instructions:* 
    *   Import `GoogleGenerativeAI` from `@google/generative-ai` and `VertexAI` from `@google-cloud/vertexai`.
    *   Implement the `getLLMModel(systemInstruction)` factory function.
    *   Check `process.env.USE_VERTEX_AI === 'true'`.
    *   If true: Instantiate `VertexAI` using `project: process.env.VERTEX_PROJECT` and `location: process.env.VERTEX_LOCATION || 'us-central1'`. Return the model via `vertex_ai.getGenerativeModel({ model: process.env.VERTEX_MODEL || 'gemini-3.1-pro-preview', systemInstruction })`.
    *   If false/unset: Instantiate `GoogleGenerativeAI` using `process.env.GOOGLE_API_KEY`. Throw an error if the key is missing. Return the model via `genAI.getGenerativeModel({ model: process.env.MODEL_NAME || 'gemini-3-flash-preview', systemInstruction })`.
*   *Verification:* Run `cd agent && npm test` to see tests pass (Green).

### Phase 3: Refactor Server
#### Step 3.A (The Core Change): Integrate `llm-provider.js` into `server.js`
*   *Target File:* `agent/src/server.js`
*   *Instructions:*
    *   Remove `import { GoogleGenerativeAI } from "@google/generative-ai"`.
    *   Import `getLLMModel` from `./lib/llm-provider.js`.
    *   Locate the direct instantiation of `GoogleGenerativeAI` (e.g., `new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)`).
    *   Replace it with a call to `getLLMModel(systemInstruction)`. Note: The system instruction might be passed dynamically depending on the route, so adjust the `getLLMModel` call site appropriately.
*   *Verification:* Run `cd agent && npm run lint` to ensure no unused imports and `cd agent && npm test` to ensure existing tests pass.

#### Step 3.B (The Verification Harness): Verify End-to-End Functionality
*   *Target File:* N/A
*   *Instructions:* Confirm the agent still functions with standard AI Studio keys.
*   *Verification:* Run `cd agent && npm run test:e2e` (Requires proper `.env` setup as specified in global context).
