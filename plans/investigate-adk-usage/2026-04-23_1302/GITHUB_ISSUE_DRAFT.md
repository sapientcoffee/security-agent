# Feature Request: Migrate AI Orchestration to Google Agent Development Kit (ADK)

## 🎯 Problem Statement
The current implementation of the Security Audit Agent relies on a custom-built abstraction (`llm-provider.js`) for interacting with the Vertex AI SDK. While functional for initial development, this "hand-rolled" orchestration layer lacks native support for advanced agentic behaviors (tool calling, RAG), standardized observability, and long-term maintainability.

As we scale to support complex "Day 2" operations and more sophisticated security auditing workflows, the current architecture will become a bottleneck for development speed and operational visibility.

## 💡 Proposed Solution
Migrate the existing AI interaction logic from the raw `@google-cloud/vertexai` SDK to the **Google Agent Development Kit (ADK)** or a compatible enterprise-grade framework (e.g., Firebase Genkit).

### Key Architectural Changes:
1. **Refactor `llm-provider.js`:** Replace custom factory logic with ADK's model initialization and configuration management.
2. **Implement Standardized Tracing:** Enable ADK's native OpenTelemetry/Cloud Trace integration to capture detailed reasoning chains and token usage.
3. **Standardize Tool Definitions:** Migrate any manual function-calling logic to ADK’s standard Tool/Action registration system.

## 🚀 Business & Technical Value
- **Observability:** Gain deep visibility into agent "thought processes" and token costs without writing custom logging glue code.
- **Developer Velocity:** Reduce boilerplate for adding new tools (e.g., Firestore queries, GitHub API interactions).
- **Future Proofing:** Benefit from framework-level updates for new Gemini features and model modalities with minimal code changes.
- **Day 2 Readiness:** Easier maintenance and standardized debugging for production-grade agentic workflows.

## 📝 Implementation Tasks
- [ ] Research and select the specific ADK/Genkit package version compatible with our current Node.js environment.
- [ ] Update `agent/package.json` with new dependencies and remove obsolete SDK wrappers.
- [ ] Refactor `agent/src/lib/llm-provider.js` to use the ADK/Genkit initialization pattern.
- [ ] Configure global observability exports to Google Cloud Trace/Logging via the framework.
- [ ] Migrate the `/api/analyze` and `/v1/message:send` endpoints to use the new orchestration layer.
- [ ] Verify existing test suites pass with the new implementation.

## ✅ Success Criteria
- [ ] The agent service initializes and interacts with Gemini via the ADK abstraction.
- [ ] Detailed traces (including prompts and reasoning steps) are visible in Google Cloud Trace for every request.
- [ ] Token usage and latency per reasoning turn are recorded in standard logs.
- [ ] The code footprint for model initialization in `llm-provider.js` is reduced by delegating to framework defaults.
- [ ] No regression in performance or response accuracy compared to the direct SDK implementation.

## 🔗 Related Context
- Current implementation: `agent/src/lib/llm-provider.js`
- Primary AI SDK: `@google-cloud/vertexai`
- Research Report: `plans/investigate-adk-usage/2026-04-23_1302/02_RESEARCH_REPORT.md`
