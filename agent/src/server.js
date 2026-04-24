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

import { initTelemetry } from "./lib/telemetry.js";
initTelemetry();

import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import logger from "./utils/logger.js";
import { verifyToken } from "./middleware/auth.js";
import { 
  validateBody, 
  analyzeSchema,
  messageSendSchema
} from './middleware/validate.js';
import { LlmAgent, toA2a, Gemini } from "@google/adk";
import { processGitRepo } from "./git-processor.js";
import crypto from "crypto";

// Initialize Firebase Admin for Firestore
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json({ limit: '10mb' }));

// Security Fix: Restrict CORS to trusted origins
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.length === 0) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Cloud-Trace-Context'],
  credentials: true
}));

// --- ADK Agent Initialization ---

const modelName = process.env.MODEL_NAME || "gemini-flash-latest";
let llm;

if (process.env.USE_VERTEX_AI === "true") {
  llm = new Gemini({
    model: modelName,
    vertexai: true,
    project: process.env.VERTEX_PROJECT,
    location: process.env.VERTEX_LOCATION || "us-central1",
  });
} else {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
  llm = new Gemini({
    model: modelName,
    apiKey: apiKey,
  });
}

const agent = new LlmAgent({
  name: "security-auditor",
  description: "A specialized agent for security auditing, providing code reviews, bug hunting, and security alignment checks.",
  model: llm,
  instruction: "You are a specialized QA and Security Engineer. Your goal is to ensure the provided code is perfectly functional and secure. Instructions: 1. Assess Alignment. 2. Bug Hunting. 3. Security Audit. 4. Output Format: actionable audit report in Markdown.",
});

// --- UI-specific streaming security analysis endpoint ---
app.post("/api/analyze", verifyToken, validateBody(analyzeSchema), async (req, res) => {
  const { content, inputType, structured } = req.body;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const abortController = new AbortController();
  req.on('close', () => {
    abortController.abort();
  });

  try {
    let codeToAnalyze = content;

    if (inputType === 'git') {
      const onProgress = (status) => {
        if (res.writable) {
          res.write(`data: ${JSON.stringify({ status: 'progress', message: `Task: ${status}` })}\n\n`);
        }
      };
      codeToAnalyze = await processGitRepo(content, onProgress, abortController.signal);
    }

    if (!codeToAnalyze || abortController.signal.aborted) {
      if (res.writable && !abortController.signal.aborted) {
        res.write(`data: ${JSON.stringify({ status: 'error', message: 'No code provided for analysis or aborted' })}\n\n`);
      }
      return res.end();
    }

    let instruction = agent.instruction;
    if (structured) {
      instruction += " Output Format: You MUST return a JSON object with schema: { summary: string, comments: [{ path: string, line: number, body: string }] }";
    }

    const result = await llm.generateContentAsync({
      contents: [{ role: 'user', parts: [{ text: codeToAnalyze }] }],
      config: { systemInstruction: instruction, responseMimeType: structured ? "application/json" : "text/plain" }
    });

    let fullText = "";
    for await (const response of result) {
      if (abortController.signal.aborted) break;
      const text = response.content?.parts?.[0]?.text || "";
      fullText += text;
      if (!structured && text && res.writable) {
        res.write(`data: ${JSON.stringify({ status: 'analyzing', chunk: text })}\n\n`);
      }
    }

    if (!abortController.signal.aborted && res.writable) {
      if (structured) {
        try {
          const jsonMatch = fullText.match(/\{[\s\S]*\}/);
          const jsonText = jsonMatch ? jsonMatch[0] : fullText;
          const parsed = JSON.parse(jsonText);
          res.write(`data: ${JSON.stringify({ status: 'completed', report: parsed })}\n\n`);
        } catch (e) {
          res.write(`data: ${JSON.stringify({ status: 'error', message: 'Failed to parse structured output' })}\n\n`);
        }
      } else {
        res.write(`data: ${JSON.stringify({ status: 'completed' })}\n\n`);
      }
    }
  } catch (error) {
    logger.error("Analysis error", { error: error.message });
    if (res.writable && !abortController.signal.aborted) {
      res.write(`data: ${JSON.stringify({ status: 'error', message: error.message })}\n\n`);
    }
  } finally {
    res.end();
  }
});

// --- A2A Protocol Implementation via ADK ---
const a2aRouter = express.Router();

// Middleware to conditionally apply auth
a2aRouter.use((req, res, next) => {
  if (req.path.includes("agent-card.json") || req.path === "/agent-card" || req.path === "/card") {
    return next();
  }
  verifyToken(req, res, next);
});

// Determine public URL for agent card
const publicUrl = process.env.APP_BASE_URL || `https://security-audit-agent-300502296392.us-central1.run.app`;
const urlObj = new URL(publicUrl);

await toA2a(agent, { 
  app: a2aRouter, 
  basePath: "",
  host: urlObj.hostname,
  port: urlObj.port ? parseInt(urlObj.port) : (urlObj.protocol === 'https:' ? 443 : 80),
  protocol: urlObj.protocol.replace(':', '')
});

// HACK: Add aliases for the root paths if the client ignores transport URL
a2aRouter.post("/v1/message:send", (req, res, next) => {
  req.url = "/rest/v1/message:send";
  next();
}, a2aRouter);

a2aRouter.get("/agent-card", (req, res, next) => {
  req.url = "/.well-known/agent-card.json";
  next();
}, a2aRouter);

app.use("/", a2aRouter);

app.listen(PORT, () => {
  logger.info(`Security Audit Agent listening on port ${PORT}`);
});

export default app;
