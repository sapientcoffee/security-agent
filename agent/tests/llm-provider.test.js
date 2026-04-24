import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLLMModel, resetClientsForTesting, runAgent } from "../src/lib/llm-provider.js";
import { LlmAgent, Gemini } from "@google/adk";

// Mock the ADK LlmAgent, Runner and Gemini
vi.mock("@google/adk", () => {
  const LlmAgentMock = vi.fn().mockImplementation((config) => ({
    config,
    instruction: config.instruction,
    generationConfig: config.generateContentConfig,
    name: config.name,
  }));

  const RunnerMock = vi.fn().mockImplementation((config) => ({
    config,
    runEphemeral: vi.fn().mockImplementation(() => {
      // Return an async generator
      return (async function* () {
        yield {
          content: {
            parts: [{ text: "Mocked audit result" }]
          }
        };
      })();
    })
  }));

  const GeminiMock = vi.fn().mockImplementation((config) => ({
    config,
    model: config.model,
  }));

  return {
    LlmAgent: LlmAgentMock,
    Runner: RunnerMock,
    Gemini: GeminiMock,
    InMemorySessionService: vi.fn().mockImplementation(() => ({})),
  };
});

describe("llm-provider (ADK LlmAgent)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetClientsForTesting();
    // Set mandatory environment variables
    process.env.GOOGLE_API_KEY = "test-key";
    process.env.USE_VERTEX_AI = "false";
  });

  describe("Vertex AI Provider", () => {
    it("should instantiate LlmAgent with Vertex AI configuration when USE_VERTEX_AI is true", () => {
      process.env.USE_VERTEX_AI = "true";
      process.env.VERTEX_PROJECT = "test-project";
      process.env.VERTEX_LOCATION = "us-central1";

      const model = getLLMModel("Test instruction");
      expect(Gemini).toHaveBeenCalledWith(expect.objectContaining({
        vertexai: true,
        project: "test-project",
      }));
      expect(LlmAgent).toHaveBeenCalledWith(expect.objectContaining({
        instruction: "Test instruction",
      }));
      expect(model).toBeDefined();
    });
  });

  describe("Google AI Studio Provider", () => {
    it("should instantiate LlmAgent with Google AI configuration when USE_VERTEX_AI is false", () => {
      process.env.USE_VERTEX_AI = "false";
      process.env.GOOGLE_API_KEY = "test-key";

      const model = getLLMModel("Test instruction");
      expect(Gemini).toHaveBeenCalledWith(expect.objectContaining({
        apiKey: "test-key",
      }));
      expect(LlmAgent).toHaveBeenCalledWith(expect.objectContaining({
        instruction: "Test instruction",
      }));
      expect(model).toBeDefined();
    });
  });

  describe("runAgent", () => {
    it("should run the agent and return text", async () => {
      const result = await runAgent("test code", "test instruction");
      expect(result).toBe("Mocked audit result");
    });
  });
});
