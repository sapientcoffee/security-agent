import { LlmAgent, Runner, InMemorySessionService, Gemini } from "@google/adk";

let cachedAgent = null;
let cachedRunner = null;
const sessionService = new InMemorySessionService();

/**
 * Resets the cached clients. Used primarily for unit testing.
 */
export function resetClientsForTesting() {
  cachedAgent = null;
  cachedRunner = null;
}

export function getLLMModel(systemInstruction, generationConfig) {
  if (cachedAgent) {
    cachedAgent.instruction = systemInstruction;
    cachedAgent.generateContentConfig = generationConfig || {};
    return cachedAgent;
  }

  const modelName = process.env.MODEL_NAME || "gemini-2.0-flash-exp";
  let llm;

  if (process.env.USE_VERTEX_AI === "true") {
    if (!process.env.VERTEX_PROJECT) {
      throw new Error("VERTEX_PROJECT environment variable is required when USE_VERTEX_AI is true");
    }
    llm = new Gemini({
      model: modelName,
      vertexai: true,
      project: process.env.VERTEX_PROJECT,
      location: process.env.VERTEX_LOCATION || "us-central1",
    });
  } else {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY environment variable is required");
    }
    llm = new Gemini({
      model: modelName,
      apiKey: apiKey,
    });
  }

  cachedAgent = new LlmAgent({
    name: "security_audit_agent",
    description: "A specialized agent for security auditing and code analysis.",
    model: llm,
    instruction: systemInstruction,
    generateContentConfig: generationConfig,
  });
  
  return cachedAgent;
}

/**
 * Runs the agent with the given input and returns the final text response.
 */
export async function runAgent(input, systemInstruction, generationConfig = {}) {
  const agent = getLLMModel(systemInstruction, generationConfig);
  
  if (!cachedRunner) {
    cachedRunner = new Runner({
      appName: "security-audit-agent",
      agent: agent,
      sessionService
    });
  }

  const events = cachedRunner.runEphemeral({
    userId: "default-user",
    newMessage: {
      role: "user",
      parts: [{ text: input }]
    }
  });

  let responseText = "";
  for await (const event of events) {
    console.log("Received event:", JSON.stringify(event));
    if (event.content?.parts) {
      for (const part of event.content.parts) {
        if (part.text) {
          responseText += part.text;
        }
      }
    }
  }

  console.log("Final responseText length:", responseText.length);
  return responseText;
}

/**
 * Runs the agent and yields chunks of text for streaming.
 */
export async function* runAgentStream(input, systemInstruction, generationConfig = {}) {
  const agent = getLLMModel(systemInstruction, generationConfig);
  
  if (!cachedRunner) {
    cachedRunner = new Runner({
      appName: "security-audit-agent",
      agent: agent,
      sessionService
    });
  }

  const events = cachedRunner.runEphemeral({
    userId: "default-user",
    newMessage: {
      role: "user",
      parts: [{ text: input }]
    }
  });

  for await (const event of events) {
    if (event.content?.parts) {
      for (const part of event.content.parts) {
        if (part.text) {
          yield part.text;
        }
      }
    }
  }
}
