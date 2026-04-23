# High-Level Design: Vertex AI Support

## 1. Executive Summary
This design document outlines the architectural approach to enable the Security Audit Agent to utilize Google Cloud Vertex AI in addition to the existing Google AI Studio (Gemini) integration. The core objective is to support enterprise-grade deployments using IAM roles and Application Default Credentials (ADC), while maintaining the flexibility to use API keys via AI Studio for local development or alternative environments.

## 2. Architectural Approach: The Provider Pattern
To support multiple LLM backends without cluttering the core business logic in `server.js`, we will implement a **Provider Pattern** (Factory Pattern). 

### 2.1 The Abstraction Layer
The application will interact with a unified `LLMProvider` interface rather than directly instantiating the `@google/generative-ai` or `@google-cloud/vertexai` SDKs. This provider will be responsible for:
1. Evaluating the environment configuration.
2. Instantiating the appropriate SDK client.
3. Returning a compatible "Model" object that adheres to the expected `generateContent({ contents, systemInstruction, generationConfig })` signature.

### 2.2 Configuration Strategy
The choice of provider and its specific configuration will be driven entirely by environment variables. This ensures the application remains stateless and easily deployable across different environments without code changes.

**Core Environment Variables:**
- `USE_VERTEX_AI`: Boolean toggle (`true`/`false`). Determines which provider to initialize.
- **AI Studio Configuration:**
  - `GOOGLE_API_KEY`: Required if `USE_VERTEX_AI` is false or unset.
- **Vertex AI Configuration:**
  - `VERTEX_PROJECT`: The Google Cloud Project ID.
  - `VERTEX_LOCATION`: The Google Cloud Region (Default: `us-central1`).
  - `VERTEX_MODEL`: The specific model version to use (e.g., `gemini-3.1-pro-preview`).

## 3. Component Design

### 3.1 `agent/src/lib/llm-provider.js` (New File)
This module will serve as the factory.

**Responsibilities:**
- Read environment variables.
- If `USE_VERTEX_AI=true`:
  - Import `@google-cloud/vertexai`.
  - Initialize `VertexAI` using `VERTEX_PROJECT` and `VERTEX_LOCATION` (relying on ADC for authentication).
  - Return the model instance via `getGenerativeModel({ model: process.env.VERTEX_MODEL || 'gemini-3.1-pro-preview' })`.
- If `USE_VERTEX_AI=false` (or unset):
  - Import `@google/generative-ai`.
  - Initialize `GoogleGenerativeAI` using `GOOGLE_API_KEY`.
  - Return the model instance via `getGenerativeModel({ model: 'gemini-3-flash-preview' })` (or matching environment variable).

**Interface:**
```javascript
export function getLLMModel(systemInstruction) {
  // Returns the configured model instance ready for generateContent
}
```

### 3.2 `agent/src/server.js` (Refactor)
The main server file will be refactored to consume the new provider.

**Changes:**
- Remove direct dependency on `@google/generative-ai`.
- Remove hardcoded `new GoogleGenerativeAI(...)` initialization.
- Import `getLLMModel` from `lib/llm-provider.js`.
- During endpoint execution (or server startup), request the configured model instance (passing the system instruction if needed) and use it for `generateContent` calls.

## 4. Trade-offs & Considerations

### 4.1 Authentication (ADC vs API Key)
- **Trade-off:** Vertex AI relies on Application Default Credentials (ADC). This is significantly more secure for production (no long-lived secrets to manage) but requires proper IAM setup (granting `roles/aiplatform.user` to the Cloud Run service account).
- **Mitigation:** Retaining the AI Studio provider ensures local development remains frictionless with a simple `GOOGLE_API_KEY`.

### 4.2 SDK Surface Mismatches
- **Risk:** While the `generateContent` signature is highly similar between the two SDKs, there may be subtle differences in advanced configuration objects (e.g., `safetySettings` or `generationConfig`).
- **Mitigation:** The `llm-provider.js` must normalize these inputs if necessary, ensuring the core agent logic in `server.js` remains completely agnostic to the underlying provider.

### 4.3 Model Naming
- **Consideration:** Model availability and naming conventions can differ slightly between AI Studio and Vertex AI. The design relies on `VERTEX_MODEL` being explicitly configurable to handle any discrepancies or region-specific availability.
