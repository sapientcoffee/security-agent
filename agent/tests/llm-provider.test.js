import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getLLMModel } from "../src/lib/llm-provider.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { VertexAI } from "@google-cloud/vertexai";

// Mock @google/generative-ai
vi.mock("@google/generative-ai", () => {
  const mockGetGenerativeModel = vi.fn();
  return {
    GoogleGenerativeAI: vi.fn(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
  };
});

// Mock @google-cloud/vertexai
vi.mock("@google-cloud/vertexai", () => {
  const mockGetGenerativeModel = vi.fn();
  return {
    VertexAI: vi.fn(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
  };
});

describe("getLLMModel", () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env;
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("when USE_VERTEX_AI='true'", () => {
    beforeEach(() => {
      process.env.USE_VERTEX_AI = "true";
      process.env.VERTEX_PROJECT = "test-project";
      process.env.VERTEX_LOCATION = "us-west1";
      process.env.VERTEX_MODEL = "gemini-3.1-pro-preview";
    });

    it("should instantiate VertexAI with correct project and location and generationConfig", () => {
      const systemInstruction = "You are an expert.";
      const generationConfig = { responseMimeType: "application/json" };
      getLLMModel(systemInstruction, generationConfig);

      expect(VertexAI).toHaveBeenCalledWith({
        project: "test-project",
        location: "us-west1",
      });

      const vertexInstance = vi.mocked(VertexAI).mock.results[0].value;
      expect(vertexInstance.getGenerativeModel).toHaveBeenCalledWith({
        model: "gemini-3.1-pro-preview",
        systemInstruction,
        generationConfig,
      });
    });

    it("should fallback to 'us-central1' if VERTEX_LOCATION is missing", () => {
      delete process.env.VERTEX_LOCATION;
      getLLMModel("test");

      expect(VertexAI).toHaveBeenCalledWith({
        project: "test-project",
        location: "us-central1",
      });
    });

    it("should fallback to 'gemini-3.1-pro-preview' if VERTEX_MODEL is missing", () => {
      delete process.env.VERTEX_MODEL;
      getLLMModel("test");

      const vertexInstance = vi.mocked(VertexAI).mock.results[0].value;
      expect(vertexInstance.getGenerativeModel).toHaveBeenCalledWith({
        model: "gemini-3.1-pro-preview",
        systemInstruction: "test",
      });
    });
  });

  describe("when USE_VERTEX_AI is false or unset", () => {
    beforeEach(() => {
      delete process.env.USE_VERTEX_AI;
      process.env.GOOGLE_API_KEY = "test-api-key";
      process.env.MODEL_NAME = "gemini-3-flash-preview";
    });

    it("should instantiate GoogleGenerativeAI with GOOGLE_API_KEY and generationConfig", () => {
      const systemInstruction = "test instruction";
      const generationConfig = { responseMimeType: "application/json" };
      getLLMModel(systemInstruction, generationConfig);

      expect(GoogleGenerativeAI).toHaveBeenCalledWith("test-api-key");

      const genAIInstance = vi.mocked(GoogleGenerativeAI).mock.results[0].value;
      expect(genAIInstance.getGenerativeModel).toHaveBeenCalledWith({
        model: "gemini-3-flash-preview",
        systemInstruction,
        generationConfig,
      });
    });

    it("should fallback to 'gemini-3-flash-preview' if MODEL_NAME is missing", () => {
      delete process.env.MODEL_NAME;
      getLLMModel("test");

      const genAIInstance = vi.mocked(GoogleGenerativeAI).mock.results[0].value;
      expect(genAIInstance.getGenerativeModel).toHaveBeenCalledWith({
        model: "gemini-3-flash-preview",
        systemInstruction: "test",
      });
    });

    it("should throw an error if GOOGLE_API_KEY is missing", () => {
      delete process.env.GOOGLE_API_KEY;
      expect(() => getLLMModel("test")).toThrow(/GOOGLE_API_KEY is required/);
    });
  });
});
