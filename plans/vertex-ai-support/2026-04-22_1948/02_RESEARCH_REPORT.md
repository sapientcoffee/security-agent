# Research Report: Vertex AI Support

## Current State Analysis
The Security Audit Agent backend (`agent/src/server.js`) is currently hardcoded to use the Google AI Studio SDK (`@google/generative-ai`).

- **SDK:** `@google/generative-ai` version 0.1.x.
- **Initialization:** `const genAI = new GoogleGenerativeAI(API_KEY);` where `API_KEY` is from `process.env.GOOGLE_API_KEY`.
- **Logic:** Two main endpoints (`/api/analyze` and `/v1/message:send`) use a shared `genAI` instance to call `getGenerativeModel` and `generateContent`.
- **Model:** Currently uses `gemini-3-flash-preview` with a system instruction defining a "Security Engineer" persona.

## Technical Grounding: Vertex AI SDK
The Google Cloud Vertex AI SDK (`@google-cloud/vertexai`) provides a near-identical interface for content generation, facilitating a straightforward refactor.

### Key Differences
| Feature | AI Studio (`@google/generative-ai`) | Vertex AI (`@google-cloud/vertexai`) |
| :--- | :--- | :--- |
| **Authentication** | API Key (`GOOGLE_API_KEY`) | Application Default Credentials (ADC) / IAM |
| **Initialization** | `new GoogleGenerativeAI(apiKey)` | `new VertexAI({ project, location })` |
| **Model ID** | `gemini-1.5-pro` | `projects/{P}/locations/{L}/publishers/google/models/gemini-1.5-pro` (shorthand `gemini-1.5-pro` usually works) |
| **Endpoint** | `generativelanguage.googleapis.com` | `{location}-aiplatform.googleapis.com` |

### Implementation Pattern
The `VertexAI` class from the GCP SDK exposes a `getGenerativeModel` method that returns an object compatible with the existing `generateContent` calls.

```javascript
import { VertexAI } from '@google-cloud/vertexai';
const vertexAI = new VertexAI({ project: 'my-project', location: 'us-central1' });
const model = vertexAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
```

## Refactoring Strategy
1.  **Dependency Injection:** Move LLM client initialization out of `server.js` and into a new `agent/src/lib/llm-provider.js` factory.
2.  **Environment Variables:**
    - `USE_VERTEX_AI`: Boolean to toggle between providers.
    - `GOOGLE_API_KEY`: For AI Studio.
    - `VERTEX_PROJECT`: GCP Project ID.
    - `VERTEX_LOCATION`: GCP Region (default: `us-central1`).
    - `VERTEX_MODEL`: Specific model version (User requested: `gemini-3.1-pro-preview`).
3.  **Interface Consistency:** Ensure both providers return a "Model" object that responds to `generateContent({ contents, systemInstruction, generationConfig })`.

## Potential Risks
- **SDK Surface Mismatches:** While `generateContent` is similar, some configuration parameters (like `safetySettings` or `generationConfig` specifics) may have subtle naming differences between the two SDKs.
- **Permission Scopes:** When running on Cloud Run, the Service Account will need the `roles/aiplatform.user` role.
- **Model Availability:** `gemini-3.1-pro-preview` must be available in the specified region (`us-central1`).
