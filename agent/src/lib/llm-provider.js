import { LlmAgent } from "@google/adk";

let cachedAgent = null;

/**
 * Resets the cached clients. Used primarily for unit testing.
 */
export function resetClientsForTesting() {
  cachedAgent = null;
}

export function getLLMModel(systemInstruction, generationConfig) {
  if (cachedAgent) {
    cachedAgent.instruction = systemInstruction;
    cachedAgent.generationConfig = generationConfig || {};
    return cachedAgent;
  }

  if (process.env.USE_VERTEX_AI === "true") {
    if (!process.env.VERTEX_PROJECT) {
      throw new Error("VERTEX_PROJECT is required for Vertex AI provider.");
    }

    cachedAgent = new LlmAgent({
      model: process.env.VERTEX_MODEL || "gemini-3.1-pro-preview",
      project: process.env.VERTEX_PROJECT,
      location: process.env.VERTEX_LOCATION || "us-central1",
      instruction: systemInstruction,
      ...(generationConfig && { generationConfig }),
    });

  } else {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is required for AI Studio provider.");
    }

    cachedAgent = new LlmAgent({
      model: process.env.MODEL_NAME || "gemini-3-flash-preview",
      apiKey: process.env.GOOGLE_API_KEY,
      instruction: systemInstruction,
      ...(generationConfig && { generationConfig }),
    });
  }
  
  return cachedAgent;
}
