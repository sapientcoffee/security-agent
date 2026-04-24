# Research Report: Google Agent Development Kit (ADK) Migration

## Overview
This report provides the technical details required to migrate the security agent from its custom LLM provider abstraction to the official **Google Agent Development Kit (ADK)** for TypeScript.

## 1. Framework Identification
- **NPM Package:** `@google/adk`
- **Source Repository:** `https://github.com/google/adk-js`
- **Documentation:** `https://google.github.io/adk-docs/`
- **Primary Dependency:** `@google/genai` (^1.37.0)
- **Node.js Compatibility:** Compatible with current environment (v22.22.0). Requires ESM support.

## 2. Core Framework Concepts

### 2.1 Agent Initialization
The framework uses the `LlmAgent` class (or `BaseAgent` for custom logic) to manage interactions.
```typescript
import { LlmAgent } from '@google/adk';

const agent = new LlmAgent({
  name: 'security-audit-agent',
  description: 'Analyzes code for vulnerabilities.',
  model: 'gemini-1.5-pro',
  instruction: 'Your system instruction here...',
  tools: [/* tools here */],
});
```

### 2.2 Tool / Action Registration
Tools are defined by extending the `BaseTool` class.
- **`_getDeclaration()`**: Returns the `FunctionDeclaration` for the LLM.
- **`runAsync({ args, toolContext })`**: Implements the actual logic of the tool.

### 2.3 Observability (OpenTelemetry)
ADK has built-in support for OpenTelemetry and Google Cloud Trace.
- **Setup:** Use `maybeSetOtelProviders` from `@google/adk`.
- **GCP Integration:** Use `getGcpExporters` to configure the `TraceExporter` with the specific GCP Project ID.

## 3. Current Codebase State

### 3.1 LLM Provider (`agent/src/lib/llm-provider.js`)
- Currently a factory that returns a model from either `@google-cloud/vertexai` or `@google/generative-ai`.
- Caches clients as singletons.
- No current implementation for tools or function calling.

### 3.2 Endpoints (`agent/src/server.js`)
- **`POST /api/analyze`**: Uses `model.generateContent(codeToAnalyze)` and streams response via SSE.
- **`POST /v1/message:send`**: Similar to above, but with a different system prompt.
- Both use custom logging via Winston but lack structured tracing of the reasoning chain.

### 3.3 Dependencies (`agent/package.json`)
- Current: `@google-cloud/vertexai` (v1.12.0) and `@google/generative-ai` (v0.24.1).
- Action: These will be replaced by `@google/adk`.

## 4. Migration Strategy
1. **Dependency Update:** Install `@google/adk` and its peer dependencies (OpenTelemetry API/SDK).
2. **Provider Refactor:** Convert `llm-provider.js` to a class or module that initializes the `LlmAgent`.
3. **Telemetry Integration:** Add OTel initialization at the start of `agent/src/server.js`.
4. **Tool Migration:** If existing skills in `.gemini/skills` are to be exposed via ADK, they need a `BaseTool` wrapper.
5. **Endpoint Update:** Update route handlers to call `agent.execute()` or similar ADK runner methods instead of direct `model.generateContent`.
