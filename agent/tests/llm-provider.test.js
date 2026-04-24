import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getLLMModel, resetClientsForTesting } from "../src/lib/llm-provider.js";
import { LlmAgent } from "@google/adk";

vi.mock("@google/adk", () => {
  return {
    LlmAgent: vi.fn().mockImplementation(() => ({
      // Mock any necessary LlmAgent methods here
    })),
  };
});

describe("llm-provider (ADK LlmAgent)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    resetClientsForTesting();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Vertex AI Provider", () => {
    it("should instantiate LlmAgent with Vertex AI configuration when USE_VERTEX_AI is true", () => {
      process.env.USE_VERTEX_AI = "true";
      process.env.VERTEX_PROJECT = "test-project";
      process.env.VERTEX_LOCATION = "us-east1";
      process.env.VERTEX_MODEL = "test-model";

      getLLMModel("test instruction");

      expect(LlmAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "test-model",
          project: "test-project",
          location: "us-east1",
          instruction: "test instruction"
        })
      );
    });

    it("should throw an error if VERTEX_PROJECT is missing when USE_VERTEX_AI is true", () => {
      process.env.USE_VERTEX_AI = "true";
      delete process.env.VERTEX_PROJECT;

      expect(() => getLLMModel("test")).toThrow(/VERTEX_PROJECT is required/);
    });

    it("should use default location us-central1 if VERTEX_LOCATION is missing", () => {
      process.env.USE_VERTEX_AI = "true";
      process.env.VERTEX_PROJECT = "test-project";
      delete process.env.VERTEX_LOCATION;

      getLLMModel("test instruction");

      expect(LlmAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          location: "us-central1",
        })
      );
    });

    it("should reuse the LlmAgent instance (singleton) for Vertex AI", () => {
      process.env.USE_VERTEX_AI = "true";
      process.env.VERTEX_PROJECT = "test-project";

      getLLMModel("inst 1");
      getLLMModel("inst 2");

      expect(LlmAgent).toHaveBeenCalledTimes(1);
    });
  });

  describe("Google AI Studio Provider", () => {
    it("should instantiate LlmAgent with Google AI configuration when USE_VERTEX_AI is false", () => {
      process.env.USE_VERTEX_AI = "false";
      process.env.GOOGLE_API_KEY = "test-api-key";
      process.env.MODEL_NAME = "test-model";

      getLLMModel("test instruction");

      expect(LlmAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "test-model",
          apiKey: "test-api-key",
          instruction: "test instruction"
        })
      );
    });

    it("should throw an error if GOOGLE_API_KEY is missing", () => {
      process.env.USE_VERTEX_AI = "false";
      delete process.env.GOOGLE_API_KEY;

      expect(() => getLLMModel("test instruction")).toThrow(/GOOGLE_API_KEY is required/);
    });

    it("should reuse the LlmAgent instance (singleton) for Google AI", () => {
      process.env.USE_VERTEX_AI = "false";
      process.env.GOOGLE_API_KEY = "test-api-key";

      getLLMModel("inst 1");
      getLLMModel("inst 2");

      expect(LlmAgent).toHaveBeenCalledTimes(1);
    });
  });

  describe("Common Configuration", () => {
    it("should pass generationConfig to LlmAgent", () => {
      process.env.USE_VERTEX_AI = "false";
      process.env.GOOGLE_API_KEY = "test-key";
      const config = { temperature: 0.5 };

      getLLMModel("test inst", config);

      expect(LlmAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: config,
        })
      );
    });
  });
});
