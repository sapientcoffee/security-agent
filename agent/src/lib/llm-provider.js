import { GoogleGenerativeAI } from "@google/generative-ai";
import { VertexAI } from "@google-cloud/vertexai";

let vertexAIClient = null;
let googleAIStudioClient = null;

/**
 * Resets the cached clients. Used primarily for unit testing.
 */
export function resetClientsForTesting() {
  vertexAIClient = null;
  googleAIStudioClient = null;
}

export function getLLMModel(systemInstruction, generationConfig) {
  if (process.env.USE_VERTEX_AI === "true") {
    if (!process.env.VERTEX_PROJECT) {
      throw new Error("VERTEX_PROJECT is required for Vertex AI provider.");
    }

    if (!vertexAIClient) {
      vertexAIClient = new VertexAI({
        project: process.env.VERTEX_PROJECT,
        location: process.env.VERTEX_LOCATION || "us-central1",
      });
    }

    return vertexAIClient.getGenerativeModel({
      model: process.env.VERTEX_MODEL || "gemini-3.1-pro-preview",
      systemInstruction,
      generationConfig,
    });
  } else {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is required for AI Studio provider.");
    }

    if (!googleAIStudioClient) {
      googleAIStudioClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }

    return googleAIStudioClient.getGenerativeModel({
      model: process.env.MODEL_NAME || "gemini-3-flash-preview",
      systemInstruction,
      generationConfig,
    });
  }
}
