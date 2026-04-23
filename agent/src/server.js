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
import { admin } from "./lib/firebase.js";
import { asyncHandler } from "./utils/asyncHandler.js";

dotenv.config();

const db = admin.firestore();
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
  
  // Extract Trace ID from Google Cloud Trace header if present
  const traceHeader = req.get('x-cloud-trace-context');
  const traceId = traceHeader ? traceHeader.split('/')[0] : crypto.randomUUID();
  const fullTraceId = process.env.GOOGLE_CLOUD_PROJECT 
    ? `projects/${process.env.GOOGLE_CLOUD_PROJECT}/traces/${traceId}`
    : traceId;

  const httpRequest = {
    requestMethod: req.method,
    requestUrl: req.originalUrl || req.url,
    userAgent: req.get('user-agent'),
    remoteIp: req.get('x-forwarded-for') || req.socket.remoteAddress,
  };

  const context = { traceId: fullTraceId, httpRequest };
  
  asyncLocalStorage.run(context, () => {
    logger.info(`${req.method} ${req.url}`);
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const finalHttpRequest = {
        ...httpRequest,
        status: res.statusCode,
        latency: `${(duration / 1000).toFixed(3)}s`,
        responseSize: res.get('Content-Length'),
      };

      asyncLocalStorage.run({ ...context, httpRequest: finalHttpRequest }, () => {
        logger.info(`Response Status: ${res.statusCode} (${duration}ms)`);
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

app.post("/api/analyze", verifyToken, asyncHandler(async (req, res) => {
  const { inputType, content, structured } = req.body;
  let codeToAnalyze = "";

  if (inputType === 'git') {
    logger.info(`Processing git repo: ${content}`, { module: 'git' });
    codeToAnalyze = await processGitRepo(content);
  } else {
    codeToAnalyze = content;
  }

  if (!codeToAnalyze) {
    const error = new Error("No code provided for analysis");
    error.status = 400;
    throw error;
  }

  if (!API_KEY) {
    const error = new Error("GOOGLE_API_KEY is not configured");
    error.status = 500;
    throw error;
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
      const error = new Error("Failed to generate structured output");
      error.status = 500;
      throw error;
    }
  }

  res.json({ report: output });
}));

app.post("/v1/message:send", verifyToken, asyncHandler(async (req, res) => {
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
    const error = new Error("GOOGLE_API_KEY is not configured");
    error.status = 500;
    throw error;
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
}));

/**
 * Get the current user's GitHub App configuration.
 */
app.get("/api/github/config", verifyToken, asyncHandler(async (req, res) => {
  const uid = req.user.uid;
  
  // Get user doc to find appId
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists || !userDoc.data().githubAppId) {
    return res.json({ configured: false });
  }

  const appId = userDoc.data().githubAppId;
  const appDoc = await db.collection('github_apps').doc(appId).get();
  
  if (!appDoc.exists) {
    return res.json({ configured: false });
  }

  const data = appDoc.data();
  res.json({
    configured: true,
    appId: data.appId,
    name: data.name || 'Personal Security Bot',
    htmlUrl: data.htmlUrl,
    installedAt: data.installedAt,
    lastTriggeredAt: data.lastTriggeredAt,
    repositories: data.repositories || []
  });
}));

/**
 * Delete the current user's GitHub App configuration and references.
 */
app.delete("/api/github/config", verifyToken, asyncHandler(async (req, res) => {
  const uid = req.user.uid;
  
  // 1. Get user doc to find the appId
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists || !userDoc.data().githubAppId) {
    const error = new Error('No GitHub configuration found to delete');
    error.status = 404;
    throw error;
  }

  const appId = userDoc.data().githubAppId;

  logger.info(`Deleting GitHub App integration ${appId} for user ${uid}...`);

  // 2. Delete the GitHub App document
  await db.collection('github_apps').doc(appId).delete();
  
  // 3. Remove the reference from the user document
  await db.collection('users').doc(uid).update({
    githubAppId: admin.firestore.FieldValue.delete()
  });

  logger.info(`Successfully deleted GitHub App ${appId} and unlinked from user ${uid}`);

  res.json({ success: true, message: 'GitHub integration removed successfully' });
}));

/**
 * Exchange GitHub App Manifest code for credentials and store them in Firestore.
 */
app.post("/api/github/finalize-setup", verifyToken, asyncHandler(async (req, res) => {
  const { code } = req.body;
  const uid = req.user.uid;

  if (!code) {
    const error = new Error('Missing code parameter');
    error.status = 400;
    throw error;
  }

  logger.info(`Finalizing GitHub setup for user ${uid}...`);

  // Exchange the code for the app configuration
  const githubResponse = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json'
    }
  });

  if (!githubResponse.ok) {
    const errorData = await githubResponse.text();
    logger.error('GitHub API error during code conversion', { status: githubResponse.status, error: errorData });
    const error = new Error(`GitHub API error: ${githubResponse.status}`);
    error.status = 502;
    throw error;
  }

  const appConfig = await githubResponse.json();

  const githubData = {
    appId: appConfig.id.toString(),
    name: appConfig.name,
    webhookSecret: appConfig.webhook_secret,
    privateKey: appConfig.pem,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ownerUid: uid,
    htmlUrl: appConfig.html_url
  };

  // Store by appId for fast lookup during webhooks, and link to uid
  await db.collection('github_apps').doc(githubData.appId).set(githubData);
  
  // Also store reference in user document
  await db.collection('users').doc(uid).set({
    githubAppId: githubData.appId
  }, { merge: true });

  logger.info(`Successfully stored GitHub App ${githubData.appId} for user ${uid}`);

  res.json({ 
    success: true, 
    appId: githubData.appId,
    installUrl: `${appConfig.html_url}/installations/new`
  });
}));

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
