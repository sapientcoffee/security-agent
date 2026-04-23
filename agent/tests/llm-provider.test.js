import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getLLMModel, resetClientsForTesting } from "../src/lib/llm-provider.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { VertexAI } from "@google-cloud/vertexai";

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({ generateContent: vi.fn() }),
    })),
  };
});

vi.mock("@google-cloud/vertexai", () => {
  return {
    VertexAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({ generateContent: vi.fn() }),
    })),
  };
});

describe("llm-provider", () => {
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
    it("should instantiate VertexAI with correct config when USE_VERTEX_AI is true", () => {
      process.env.USE_VERTEX_AI = "true";
      process.env.VERTEX_PROJECT = "test-project";
      process.env.VERTEX_LOCATION = "us-east1";

      getLLMModel("test instruction");

      expect(VertexAI).toHaveBeenCalledWith({
        project: "test-project",
        location: "us-east1",
      });
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

      expect(VertexAI).toHaveBeenCalledWith({
        project: "test-project",
        location: "us-central1",
      });
    });

    it("should reuse the VertexAI client (singleton)", () => {
      process.env.USE_VERTEX_AI = "true";
      process.env.VERTEX_PROJECT = "test-project";

      getLLMModel("inst 1");
      getLLMModel("inst 2");

      expect(VertexAI).toHaveBeenCalledTimes(1);
    });
  });

  describe("Google AI Studio Provider", () => {
    it("should instantiate GoogleGenerativeAI when USE_VERTEX_AI is false", () => {
      process.env.USE_VERTEX_AI = "false";
      process.env.GOOGLE_API_KEY = "test-api-key";

      getLLMModel("test instruction");

      expect(GoogleGenerativeAI).toHaveBeenCalledWith("test-api-key");
    });

    it("should throw an error if GOOGLE_API_KEY is missing", () => {
      process.env.USE_VERTEX_AI = "false";
      delete process.env.GOOGLE_API_KEY;

      expect(() => getLLMModel("test instruction")).toThrow(/GOOGLE_API_KEY is required/);
    });

    it("should reuse the GoogleGenerativeAI client (singleton)", () => {
      process.env.USE_VERTEX_AI = "false";
      process.env.GOOGLE_API_KEY = "test-api-key";

      getLLMModel("inst 1");
      getLLMModel("inst 2");

      expect(GoogleGenerativeAI).toHaveBeenCalledTimes(1);
    });
  });

  describe("Common Configuration", () => {
    it("should pass generationConfig to getGenerativeModel", () => {
      process.env.USE_VERTEX_AI = "false";
      process.env.GOOGLE_API_KEY = "test-key";
      const config = { temperature: 0.5 };

      getLLMModel("test inst", config);

      const genAIInstance = vi.mocked(GoogleGenerativeAI).mock.results[0].value;
      expect(genAIInstance.getGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: config,
        })
      );
    });
  });
});
