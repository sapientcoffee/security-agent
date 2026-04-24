# High-Level Design: Migrate AI Orchestration to Google Agent Development Kit (ADK)

## 1. Architectural Approach
We are shifting from a **Raw Client Factory Pattern** to an **Agent-Oriented Architecture** using `@google/adk`. Instead of directly instantiating `@google-cloud/vertexai` or `@google/generative-ai` models, we will encapsulate our prompt logic, capabilities, and configurations inside `LlmAgent` instances. This transition standardizes tool definitions and transparently handles advanced capabilities like OpenTelemetry integration without bloating our core service layer.

**Trade-offs:** 
- *Pros:* Highly observable, declarative tool abstraction, removes the need for custom orchestrator boilerplate.
- *Cons:* Adopts a higher-level abstraction which may restrict fine-grained control over raw HTTP requests to the Gemini API.

## 2. Refactoring `llm-provider.js`
The `agent/src/lib/llm-provider.js` will transition from a simple factory returning raw Vertex/Gemini models to an **Agent Registry** or **Agent Factory**.

- **Current State:** Caches and returns `generativeModel` singletons.
- **Future State:** Instantiates and caches instances of `LlmAgent` configured for specific domain tasks (e.g., a `SecurityAnalysisAgent`). 
- **Signature Changes:** It will expose factory functions like `getSecurityAgent()` which internally wraps the model configuration, instructions, and the required tool dependencies array into the `LlmAgent` initialization.

## 3. Observability (OpenTelemetry / Cloud Trace)
Tracing will be integrated into the application's bootstrap lifecycle.
- **Bootstrapping:** Telemetry initialization must occur at the very beginning of the Node.js entry point (`agent/src/server.js`), strictly before the ADK or HTTP framework starts handling traffic.
- **Configuration:** We will use `maybeSetOtelProviders()` alongside `getGcpExporters()` from the ADK to automatically wire up `TraceExporter` targeting the specific GCP Project ID. 
- **Impact:** This ensures that reasoning loops, model calls, and latency spans are automatically shipped to Google Cloud Trace, satisfying our observability requirements with minimal custom span management.

## 4. Security Analysis Logic & Execution Model
Existing security analysis logic (currently driven by strings sent to `model.generateContent`) will be migrated into the formal definition of the ADK `LlmAgent`.
- **System Instructions:** Existing system prompts will be natively set via the `instruction` parameter on the `LlmAgent` constructor.
- **Tool Mapping:** Should the security agent need to dynamically query file contexts or run external checks, those actions will be refactored to extend the ADK `BaseTool` class, explicitly defining `_getDeclaration()` for the schema and `runAsync()` for execution.
- **Execution:** Requests to `/api/analyze` will map the incoming codebase payload to the agent's input, delegating reasoning execution to the ADK's orchestrator mechanism.

## 5. Streaming Responses (SSE)
Since the endpoints `/api/analyze` and `/v1/message:send` require streaming, we will integrate ADK's streaming capabilities with our existing SSE (Server-Sent Events) middleware.
- **Adapter Logic:** Instead of consuming `model.generateContentStream`, the route handlers will invoke the equivalent streaming execution method on the `LlmAgent` (e.g. streaming runners or iterators provided by the ADK).
- **Chunk Bridging:** As chunks arrive from the ADK orchestrator, they will be mapped into the standard SSE event format and flushed directly to the Express `res` object, retaining real-time interactivity while benefiting from the agent framework's structured output.
