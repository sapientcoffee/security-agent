# Walkthrough: Vertex AI Support

## Technical Summary
The `vertex-ai-support` feature introduces a provider-based abstraction for LLM interactions. By refactoring the direct dependency on Google AI Studio into a factory pattern, the agent can now dynamically switch between **Google AI Studio** and **Google Cloud Vertex AI** based on environment configuration.

### Key Changes
1.  **Provider Abstraction:** Created `agent/src/lib/llm-provider.js` which handles the initialization of either the `@google/generative-ai` (AI Studio) or `@google-cloud/vertexai` (Vertex AI) SDKs.
2.  **Configuration Toggles:** Introduced `USE_VERTEX_AI` environment variable. When set to `true`, the agent utilizes Application Default Credentials (ADC) to authenticate with Vertex AI, enabling secure, IAM-based access in GCP environments.
3.  **Default Model Support:** Added support for `gemini-3.1-pro-preview` as the default model for Vertex AI, while maintaining `gemini-3-flash-preview` for AI Studio.
4.  **Server Refactor:** Updated `agent/src/server.js` to be provider-agnostic, using the unified `getLLMModel` interface for all analysis requests.

## Visual Evidence

### Landing Page
The Security Audit Agent UI remains functional and unaffected by the backend provider refactor.

![Landing Page](plans/vertex-ai-support/2026-04-22_1948/01_landing_page.png)

## Verification Steps
1.  **Unit Testing:** Verified provider logic with 6 dedicated unit tests in `agent/tests/llm-provider.test.js`.
2.  **Regression Testing:** Confirmed all existing server tests pass (14/14), ensuring the refactor didn't break AI Studio functionality.
3.  **Configuration Verification:** Confirmed that omitting the API key in AI Studio mode results in a clear error message, as expected.

## Environment Configuration
To use Vertex AI, set the following environment variables:
```bash
USE_VERTEX_AI=true
VERTEX_PROJECT=<your-gcp-project-id>
VERTEX_LOCATION=us-central1
VERTEX_MODEL=gemini-3.1-pro-preview
```
To continue using AI Studio (default):
```bash
GOOGLE_API_KEY=<your-api-key>
```
