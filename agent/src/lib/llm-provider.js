import { GoogleGenerativeAI } from "@google/generative-ai";
import { VertexAI } from "@google-cloud/vertexai";

export function getLLMModel(systemInstruction) {
  if (process.env.USE_VERTEX_AI === "true") {
    const vertexAI = new VertexAI({
      project: process.env.VERTEX_PROJECT,
      location: process.env.VERTEX_LOCATION || "us-central1",
    });
    return vertexAI.getGenerativeModel({
      model: process.env.VERTEX_MODEL || "gemini-3.1-pro-preview",
      systemInstruction,
    });
  } else {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is required for AI Studio provider.");
    }
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    return genAI.getGenerativeModel({
      model: process.env.MODEL_NAME || "gemini-3-flash-preview",
      systemInstruction,
    });
  }
}
