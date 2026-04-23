# Requirements: Vertex AI Support

## Objective
Modify the backend agent to optionally use the Vertex AI SDK and authenticate using Google Cloud Application Default Credentials (ADC) or explicit IAM roles. This aligns the agent with enterprise-grade deployments and Google Cloud native services.

## User Stories
- **US.1: Native GCP Authentication:** As a developer, I want the agent to authenticate with Vertex AI using IAM roles/ADC so I don't have to manage long-lived API keys.
- **US.2: Provider Toggle:** As an operator, I want a configuration toggle (e.g., `USE_VERTEX_AI=true`) to choose between Google AI Studio (Gemini) and Vertex AI.
- **US.3: Consistent Analysis:** As a user, I want the security analysis reports to be identical in quality and format regardless of whether AI Studio or Vertex AI is used as the backend.

## Constraints & Technical Specifications
- **SDK:** Use the official `@google-cloud/vertexai` library.
- **Authentication:** Must support Application Default Credentials (ADC).
- **Architecture:** The `agent/src/server.js` (or relevant LLM logic) should be refactored to abstract the provider choice.
- **Configuration:** Use environment variables for switching and for Vertex-specific parameters.
    - Default Region: `us-central1`
    - Default Model: `gemini-3.1-pro-preview` (or equivalent available Vertex AI model)

## Success Criteria
- [ ] Agent successfully authenticates with Vertex AI using ADC.
- [ ] Security analysis reports are generated correctly via the Vertex AI endpoint.
- [ ] The choice between AI Studio and Vertex AI is easily configurable.
- [ ] Local development continues to work seamlessly (likely using AI Studio or local ADC).
