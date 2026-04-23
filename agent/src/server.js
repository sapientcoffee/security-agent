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
import { getLLMModel } from "./lib/llm-provider.js";
import { getAgentCard } from "./agent-card.js";
import { processGitRepo } from "./git-processor.js";
import logger, { asyncLocalStorage } from "./utils/logger.js";
import { verifyToken } from "./middleware/auth.js";
import { admin } from "./lib/firebase.js";
import { asyncHandler } from "./utils/asyncHandler.js";

dotenv.config();

import { safeJsonParse } from './utils/ai-utils.js';
import { upsertSecret } from './lib/secrets.js';

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

app.get("/agent-card", (req, res) => {
  // Construct absolute base URL, ensuring HTTPS if behind a proxy like Cloud Run
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  logger.debug(`Generating agent card with baseUrl: ${baseUrl}`);
  res.json(getAgentCard(baseUrl));
});

app.post("/api/analyze", verifyToken, asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const { inputType, content, structured } = req.body;
    let codeToAnalyze = "";

    if (inputType === 'git') {
      logger.info(`Processing git repo: ${content}`, { module: 'git' });
      codeToAnalyze = await processGitRepo(content, (status) => {
        if (res.writable) {
          res.write(`data: ${JSON.stringify({ status })}\n\n`);
        }
      });
    } else {
      codeToAnalyze = content;
    }

    if (!codeToAnalyze) {
      if (res.writable) {
        res.write(`data: ${JSON.stringify({ status: 'error', message: 'No code provided for analysis' })}\n\n`);
      }
      return res.end();
    }

    if (res.writable) {
      res.write(`data: ${JSON.stringify({ status: 'analyzing' })}\n\n`);
    }
    logger.info("Calling LLM Provider for security analysis...", { module: 'ai', structured });

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

    const model = getLLMModel(systemInstruction, generationConfig);

    const result = await model.generateContent(codeToAnalyze);
    const response = await result.response;
    const output = response.text();

    if (structured) {
      try {
        const parsed = safeJsonParse(output);
        if (res.writable) {
          res.write(`data: ${JSON.stringify({ status: 'completed', report: JSON.stringify(parsed) })}\n\n`);
        }
      } catch (e) {
        logger.error("Failed to parse structured output from AI", { output, error: e.message });
        if (res.writable) {
          res.write(`data: ${JSON.stringify({ status: 'error', message: 'Failed to generate structured output' })}\n\n`);
        }
      }
    } else {
      if (res.writable) {
        res.write(`data: ${JSON.stringify({ status: 'completed', report: output })}\n\n`);
      }
    }
  } catch (error) {
    logger.error("Analysis error:", { error: error.message });
    if (res.writable) {
      res.write(`data: ${JSON.stringify({ status: 'error', message: error.message })}\n\n`);
    }
  } finally {
    res.end();
  }
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

  logger.info("Calling LLM Provider for message generation...", { module: 'ai' });

  const model = getLLMModel("You are a specialized QA and Security Engineer. Your goal is to ensure the provided code is perfectly functional and secure. Instructions: 1. Assess Alignment. 2. Bug Hunting. 3. Security Audit. 4. Output Format: actionable audit report.");

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
 * Get the current user's GitHub review history.
 */
app.get("/api/github/reviews", verifyToken, asyncHandler(async (req, res) => {
  const uid = req.user.uid;
  
  const snapshot = await db.collection('github_reviews')
    .where('ownerUid', '==', uid)
    .orderBy('timestamp', 'desc')
    .limit(20)
    .get();
  
  const reviews = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    reviews.push({ 
      id: doc.id, 
      ...data,
      timestamp: data.timestamp?.toDate() || null
    });
  });
  
  res.json(reviews);
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

  // Use a transaction for atomic deletion of the app document and unlinking from the user
  await db.runTransaction(async (transaction) => {
    const appDocRef = db.collection('github_apps').doc(appId);
    const userDocRef = db.collection('users').doc(uid);

    transaction.delete(appDocRef);
    transaction.update(userDocRef, {
      githubAppId: admin.firestore.FieldValue.delete()
    });
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
  const appId = appConfig.id.toString();

  // Store the private key securely in Secret Manager
  logger.info(`Storing private key in Secret Manager for App ${appId}...`);
  const secretName = await upsertSecret(appId, appConfig.pem);

  const githubData = {
    appId: appId,
    name: appConfig.name,
    webhookSecret: appConfig.webhook_secret,
    // We no longer store the PEM in plaintext. 
    // We store the secret name and a flag for retrieval.
    privateKeySecretName: secretName,
    useSecretManager: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ownerUid: uid,
    htmlUrl: appConfig.html_url
  };

  // Store by appId for fast lookup during webhooks, and link to uid in a transaction for atomicity
  await db.runTransaction(async (transaction) => {
    const appDocRef = db.collection('github_apps').doc(githubData.appId);
    const userDocRef = db.collection('users').doc(uid);

    transaction.set(appDocRef, githubData);
    transaction.set(userDocRef, {
      githubAppId: githubData.appId
    }, { merge: true });
  });

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
