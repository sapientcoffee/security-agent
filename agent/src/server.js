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

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAgentCard } from "./agent-card.js";
import { processGitRepo } from "./git-processor.js";
import logger, { asyncLocalStorage } from "./utils/logger.js";
import { verifyToken } from "./middleware/auth.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Helper to mask sensitive HTTP headers in logs
const sanitizeHeaders = (headers) => {
  const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];
  const sanitized = { ...headers };
  for (const header of SENSITIVE_HEADERS) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }
  return sanitized;
};

// Verbose request logging middleware with AsyncLocalStorage for correlation
app.use((req, res, next) => {
  const start = Date.now();
  
  // Support Google Cloud Trace correlation via X-Cloud-Trace-Context header
  const traceHeader = req.get('x-cloud-trace-context');
  const traceIdMatch = traceHeader ? traceHeader.match(/^([a-f0-9]{32})/) : null;
  const requestId = (traceIdMatch && traceIdMatch[1]) || req.get('x-request-id') || crypto.randomUUID();

  // Standard Google Cloud Logging httpRequest object
  const httpRequest = {
    requestMethod: req.method,
    requestUrl: req.originalUrl || req.url,
    userAgent: req.get('user-agent'),
    remoteIp: req.get('x-forwarded-for') || req.socket.remoteAddress,
  };

  const context = { requestId, httpRequest };
  
  asyncLocalStorage.run(context, () => {
    logger.info(`>>> REQUEST ${req.method} ${req.url}`);
    
    // Don't log full headers or body for analysis requests to keep logs cleaner
    if (req.url === '/api/analyze') {
      logger.debug("Analysis Request (Headers/Body omitted for brevity)");
    } else {
      logger.debug("Request Headers", { headers: sanitizeHeaders(req.headers) });
      if (req.method === 'POST' && req.body) {
        let bodyString;
        try {
          bodyString = JSON.stringify(req.body);
        } catch (_e) {
          bodyString = "[Unserializable Body]";
        }
        
        if (bodyString.length > 1000) {
          logger.debug(`Request Body: <OMITTED, length: ${bodyString.length}>`);
        } else {
          logger.debug("Request Body", { body: req.body });
        }
      }
    }

    // Capture the current context to explicitly re-run in the finish event listener,
    // ensuring correlation isn't lost during final output.
    res.on('finish', () => {
      const duration = Date.now() - start;
      const finalHttpRequest = {
        ...httpRequest,
        status: res.statusCode,
        latency: `${(duration / 1000).toFixed(3)}s`,
        responseSize: res.get('Content-Length'),
      };

      asyncLocalStorage.run({ ...context, httpRequest: finalHttpRequest }, () => {
        logger.info(`<<< RESPONSE Status: ${res.statusCode} (${duration}ms)`);
      });
    });

    next();
  });
});


const PORT = process.env.PORT || 8080;
const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  logger.error("Missing GOOGLE_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(API_KEY);

app.get("/agent-card", (req, res) => {
  // Construct absolute base URL, ensuring HTTPS if behind a proxy like Cloud Run
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  logger.debug(`Generating agent card with baseUrl: ${baseUrl}`);
  res.json(getAgentCard(baseUrl));
});

app.post("/api/analyze", verifyToken, async (req, res) => {
  try {
    const { inputType, content, structured } = req.body;
    let codeToAnalyze = "";

    if (inputType === 'git') {
      logger.info(`Processing git repo: ${content}`, { module: 'git' });
      codeToAnalyze = await processGitRepo(content);
    } else {
      codeToAnalyze = content;
    }

    if (!codeToAnalyze) {
      return res.status(400).json({ error: "No code provided for analysis" });
    }

    if (!API_KEY) {
      return res.status(500).json({ error: "GOOGLE_API_KEY is not configured" });
    }

    logger.info("Calling Google AI Studio for security analysis...", { module: 'ai', structured });

    let systemInstruction = "You are a specialized QA and Security Engineer. Your goal is to ensure the provided code is perfectly functional and secure. Instructions: 1. Assess Alignment. 2. Bug Hunting. 3. Security Audit. 4. Output Format: actionable audit report in Markdown.";
    let generationConfig = {};

    if (structured) {
      systemInstruction = `You are a specialized QA and Security Engineer. Your goal is to ensure the provided code is perfectly functional and secure. 
      Instructions: 1. Assess Alignment. 2. Bug Hunting. 3. Security Audit. 
      Output Format: You MUST return a JSON object with the following schema:
      {
        "summary": "High-level markdown summary of the findings",
        "comments": [
          {
            "path": "file path",
            "line": line number (integer),
            "body": "markdown comment about the specific line"
          }
        ]
      }`;
      generationConfig = {
        responseMimeType: "application/json",
      };
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      systemInstruction,
      generationConfig
    });

    const result = await model.generateContent(codeToAnalyze);
    const response = await result.response;
    const output = response.text();

    if (structured) {
      try {
        const parsed = JSON.parse(output);
        return res.json(parsed);
      } catch (e) {
        logger.error("Failed to parse structured output from AI", { output });
        return res.status(500).json({ error: "Failed to generate structured output" });
      }
    }

    res.json({ report: output });
  } catch (error) {
    logger.error("Analysis error", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Analysis failed", message: error.message });
  }
});

app.post("/v1/message:send", verifyToken, async (req, res) => {
  try {
    const { message, text } = req.body;
    let input = "";

    if (text) {
      input = text;
    } else if (message?.content && Array.isArray(message.content)) {
      input = message.content.map(part => part.text || "").join("\n");
    } else {
      input = message?.content || message?.text || "";
    }
    
    if (!input || input === "[object Object]") {
      logger.warn("Missing or invalid input content in request body");
      if (typeof message?.content === 'object' && message.content !== null) {
        input = JSON.stringify(message.content);
      }
    }

    if (!API_KEY) {
      return res.status(500).json({ error: "GOOGLE_API_KEY is not configured" });
    }

    logger.info("Calling Google AI Studio with gemini-3-flash-preview...", { module: 'ai' });

    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      systemInstruction: "You are a specialized QA and Security Engineer. Your goal is to ensure the provided code is perfectly functional and secure. Instructions: 1. Assess Alignment. 2. Bug Hunting. 3. Security Audit. 4. Output Format: actionable audit report."
    });

    const result = await model.generateContent(input);

    const response = await result.response;
    const responseText = response.text();

    // Finalized A2A compliant response schema for Gemini CLI
    res.json({ 
      message: {
        messageId: crypto.randomUUID(),
        role: "ROLE_AGENT",
        content: [
          {
            text: responseText
          }
        ]
      }
    });
  } catch (error) {
    logger.error("Execution error", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  logger.error(err.message || 'Internal Server Error', { error: err.message, stack: err.stack });
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  logger.info(`Security Audit Agent listening on port ${PORT}`);
});
