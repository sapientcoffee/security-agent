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
import { 
  validateBody, 
  analyzeSchema, 
  messageSendSchema, 
  finalizeSetupSchema 
} from './middleware/validate.js';

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '10mb' }));

// Security Fix: Restrict CORS to trusted origins
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

// In production, ensure ALLOWED_ORIGINS is set to prevent accidental '*' wildcard exposure
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  logger.error("ALLOWED_ORIGINS must be set in production. Service will fail requests.");
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (process.env.NODE_ENV !== 'production' && !process.env.ALLOWED_ORIGINS) {
      // Allow '*' only in development if explicitly not set
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ... (sanitizeHeaders and request logging middleware) ...

app.get("/agent-card", (req, res) => {
  // Security Fix: Prefer hardcoded BASE_URL to prevent Host Header Injection
  let baseUrl = process.env.APP_BASE_URL;

  if (!baseUrl) {
    if (process.env.NODE_ENV === 'production') {
      const error = new Error("APP_BASE_URL environment variable is mandatory in production");
      logger.error(error.message);
      return res.status(500).json({ error: error.message });
    }
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    baseUrl = `${protocol}://${host}`;
    logger.warn(`APP_BASE_URL not set, falling back to dynamic baseUrl: ${baseUrl}`);
  }

  logger.debug(`Generating agent card with baseUrl: ${baseUrl}`);
  res.json(getAgentCard(baseUrl));
});

app.post("/api/analyze", verifyToken, validateBody(analyzeSchema), asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const abortController = new AbortController();
  req.on('close', () => {
    logger.info("Client disconnected, aborting analysis...");
    abortController.abort();
  });

  try {
    const { inputType, content, structured } = req.body;
    let codeToAnalyze = "";

    if (inputType === 'git') {
      logger.info(`Processing git repo: ${content}`, { module: 'git' });
      codeToAnalyze = await processGitRepo(content, (status) => {
        if (res.writable && !abortController.signal.aborted) {
          res.write(`data: ${JSON.stringify({ status })}\n\n`);
        }
      }, abortController.signal);
    } else {
      codeToAnalyze = content;
    }

    if (!codeToAnalyze || abortController.signal.aborted) {
      if (res.writable && !abortController.signal.aborted) {
        res.write(`data: ${JSON.stringify({ status: 'error', message: 'No code provided for analysis or aborted' })}\n\n`);
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

    const result = await model.runAsync(codeToAnalyze);
    
    if (abortController.signal.aborted) return res.end();

    const output = result.text;

    if (structured) {
      try {
        const parsed = safeJsonParse(output);
        if (res.writable && !abortController.signal.aborted) {
          res.write(`data: ${JSON.stringify({ status: 'completed', report: JSON.stringify(parsed) })}\n\n`);
        }
      } catch (e) {
        logger.error("Failed to parse structured output from AI", { output, error: e.message });
        if (res.writable && !abortController.signal.aborted) {
          res.write(`data: ${JSON.stringify({ status: 'error', message: 'Failed to generate structured output' })}\n\n`);
        }
      }
    } else {
      if (res.writable && !abortController.signal.aborted) {
        res.write(`data: ${JSON.stringify({ status: 'completed', report: output })}\n\n`);
      }
    }
  } catch (error) {
    if (error.name === 'AbortError' || abortController.signal.aborted) {
      logger.info("Analysis was aborted.");
    } else {
      logger.error("Analysis error:", { error: error.message });
      if (res.writable) {
        res.write(`data: ${JSON.stringify({ status: 'error', message: error.message })}\n\n`);
      }
    }
  } finally {
    res.end();
  }
}));

app.post("/v1/message:send", verifyToken, validateBody(messageSendSchema), asyncHandler(async (req, res) => {
  const { message, text } = req.body;
  let input = "";

  if (text) {
    input = text;
  } else {
    // A2A 0.3.0 uses 'parts', earlier versions used 'content'
    const parts = message?.parts || message?.content;
    if (parts && Array.isArray(parts)) {
      input = parts.map(part => part.text || "").join("\n");
    } else {
      input = message?.content || message?.text || "";
    }
  }
  
  if (!input || input === "[object Object]") {
    logger.warn("Missing or invalid input content in request body");
    if (typeof message?.content === 'object' && message.content !== null) {
      input = JSON.stringify(message.content);
    }
  }

  logger.info("Calling LLM Provider for message generation...", { module: 'ai' });

  const model = getLLMModel("You are a specialized QA and Security Engineer. Your goal is to ensure the provided code is perfectly functional and secure. Instructions: 1. Assess Alignment. 2. Bug Hunting. 3. Security Audit. 4. Output Format: actionable audit report.");

  const result = await model.runAsync(input);

  const responseText = result.text;

  // Finalized A2A compliant response schema (0.3.0) for Gemini CLI
  res.json({ 
    message: {
      messageId: crypto.randomUUID(),
      role: "model",
      parts: [
        {
          kind: "text",
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
 * Save a manual audit record to Firestore.
 */
app.post("/api/audits", verifyToken, asyncHandler(async (req, res) => {
  const uid = req.user.uid;
  const { repoUrl, inputType, report, summary } = req.body;

  if (!report) {
    return res.status(400).json({ error: "Report content is required" });
  }

  const docRef = await db.collection('manual_audits').add({
    ownerUid: uid,
    repoUrl,
    inputType,
    report,
    summary,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  res.json({ id: docRef.id, success: true });
}));

/**
 * Get the current user's manual audit history from Firestore.
 */
app.get("/api/audits", verifyToken, asyncHandler(async (req, res) => {
  const uid = req.user.uid;

  const snapshot = await db.collection('manual_audits')
    .where('ownerUid', '==', uid)
    .orderBy('timestamp', 'desc')
    .limit(50)
    .get();

  const audits = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    audits.push({
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate()?.getTime() || Date.now()
    });
  });

  res.json(audits);
}));

/**
 * Delete a specific manual audit record.
 */
app.delete("/api/audits/:id", verifyToken, asyncHandler(async (req, res) => {
  const uid = req.user.uid;
  const auditId = req.params.id;

  const docRef = db.collection('manual_audits').doc(auditId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return res.status(404).json({ error: "Audit record not found" });
  }

  if (doc.data().ownerUid !== uid) {
    return res.status(403).json({ error: "Unauthorized to delete this record" });
  }

  await docRef.delete();
  res.json({ success: true });
}));

/**
 * Delete the current user's GitHub App configuration and references.
 */app.delete("/api/github/config", verifyToken, asyncHandler(async (req, res) => {
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
app.post("/api/github/finalize-setup", verifyToken, validateBody(finalizeSetupSchema), asyncHandler(async (req, res) => {
  const { code } = req.body;
  const uid = req.user.uid;

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
