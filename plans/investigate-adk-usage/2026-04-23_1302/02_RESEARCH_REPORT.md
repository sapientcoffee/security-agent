# Research Report: Google ADK Usage Investigation

## Findings Summary
The investigation confirms that this application **does not use the Google Agent Development Kit (ADK)**. 

The application interacts with Google Cloud's AI capabilities directly via the `@google-cloud/vertexai` SDK and utilizes custom patterns for model initialization and interaction rather than a higher-level framework.

## Technical Details

### Dependency Analysis
A search of all `package.json` files (`/package.json`, `agent/package.json`, `github-bot/package.json`, `frontend/package.json`) yielded the following results for Google Cloud and AI-related dependencies:

| Service | Dependency | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Agent** | `@google-cloud/vertexai` | `^1.12.0` | Primary AI interaction (Vertex AI) |
| **Agent** | `@google/generative-ai` | `^0.21.0` | Fallback AI interaction (AI Studio) |
| **Agent** | `@google-cloud/logging-winston` | `^6.0.1` | Cloud Logging integration |
| **Agent** | `@google-cloud/secret-manager` | `^6.1.1` | Configuration/Secrets management |
| **GitHub Bot** | `@google-cloud/tasks` | `^6.2.1` | Asynchronous task management |

**Note:** No package matching `@google-cloud/adk`, `@google-cloud/agent-development-kit`, or any similar variant was found.

### Codebase Pattern Analysis
The backend implementation (`agent/src/lib/llm-provider.js` and `agent/src/server.js`) reveals the following architectural choices:

1.  **Direct SDK Usage:** The code instantiates the `VertexAI` client directly from the `@google-cloud/vertexai` package.
2.  **Custom Factory Pattern:** A custom function `getLLMModel` (in `llm-provider.js`) handles the initialization logic, switching between Vertex AI and Google AI Studio based on environment variables.
3.  **Manual Response Handling:** Interaction results are processed manually using `generateContent` and text extraction, without the use of agentic frameworks or tool-use abstractions provided by an ADK.
4.  **No High-Level Frameworks:** There is no evidence of ADK, LangChain, Genkit, or other similar agent frameworks being used in the codebase.

### String Search Results
A case-insensitive search for "ADK" and "Agent Development Kit" across the entire repository returned no matches in the source code or existing documentation. The only occurrence was in the newly created `plans/investigate-adk-usage/2026-04-23_1302/01_REQUIREMENTS.md`.

## Conclusion
The project is built using direct SDK integrations and custom abstractions. It does not leverage the Google Agent Development Kit (ADK).
