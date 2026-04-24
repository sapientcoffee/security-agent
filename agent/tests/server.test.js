import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import cors from "cors";
import { getAgentCard } from "../src/agent-card.js";

// Mock lib/llm-provider.js
vi.mock("../src/lib/llm-provider.js", () => {
  return {
    runAgent: vi.fn().mockResolvedValue("Mocked audit result"),
    runAgentStream: vi.fn().mockImplementation(async function* () {
      yield "Mocked ";
      yield "audit ";
      yield "result";
    }),
    getLLMModel: vi.fn().mockReturnValue({}),
  };
});

// Create a test app instance
const app = express();
app.use(express.json());
app.use(cors());

app.get("/agent-card", (req, res) => {
  res.json(getAgentCard("http://localhost:8080"));
});

app.post("/v1/message:send", async (req, res) => {
  const { message, text } = req.body;
  if (!message && !text) {
    return res.status(400).json({ error: "Missing message content" });
  }

  const { runAgent } = await import("../src/lib/llm-provider.js");
  const result = await runAgent("test code");

  res.json({ 
    message: { 
      messageId: "123",
      role: "model", 
      parts: [
        {
          kind: "text",
          text: result
        }
      ]
    } 
  });
});

describe("Security Audit Agent Server", () => {
  it("should return the agent card on GET /agent-card", async () => {
    const response = await request(app).get("/agent-card");
    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Security Audit Agent");
    expect(response.body.skills).toHaveLength(1);
    expect(response.body.skills[0].id).toBe("security-audit");
  });

  it("should return an audit result on POST /v1/message:send", async () => {
    const response = await request(app)
      .post("/v1/message:send")
      .send({ text: "test code" });
    expect(response.status).toBe(200);
    expect(response.body.message.role).toBe("model");
    expect(response.body.message.parts[0].text).toBe("Mocked audit result");
    expect(response.body.message.parts[0].kind).toBe("text");
  });

  it("should return 400 on POST /v1/message:send with missing message", async () => {
    const response = await request(app)
      .post("/v1/message:send")
      .send({});
    expect(response.status).toBe(400);
  });
});
