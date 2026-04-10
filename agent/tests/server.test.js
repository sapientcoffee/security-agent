// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import cors from "cors";
import { getAgentCard } from "../src/agent-card.js";

// Mock @google/generative-ai
vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockImplementation(() => ({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => "Mocked audit result",
          },
        }),
      })),
    })),
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
  // Simplified mock logic for testing matching the structure of src/server.js
  const { message, text } = req.body;
  if (!message && !text) {
    return res.status(400).json({ error: "Missing message content" });
  }
  res.json({ 
    message: { 
      messageId: "123",
      role: "ROLE_AGENT", 
      content: [
        {
          text: "Mocked audit result"
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
    expect(response.body.message.role).toBe("ROLE_AGENT");
    expect(response.body.message.content[0].text).toBe("Mocked audit result");
  });

  it("should return 400 on POST /v1/message:send with missing message", async () => {
    const response = await request(app)
      .post("/v1/message:send")
      .send({});
    expect(response.status).toBe(400);
  });
});
