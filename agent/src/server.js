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
  messageSendSchema,
  finalizeSetupSchema
} from './middleware/validate.js';
import { LlmAgent, toA2a, Gemini } from "@google/adk";
import { processGitRepo } from "./git-processor.js";
import { asyncHandler } from "./utils/asyncHandler.js";
import { upsertSecret } from './lib/secrets.js';
import crypto from "crypto";

// Initialize Firebase Admin for Firestore
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
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
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
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
          res.write(`data: ${JSON.stringify({ status: 'completed', report: JSON.stringify(parsed) })}\n\n`);
        } catch (e) {
          res.write(`data: ${JSON.stringify({ status: 'error', message: 'Failed to parse structured output' })}\n\n`);
        }
      } else {
        res.write(`data: ${JSON.stringify({ status: 'completed', report: fullText })}\n\n`);
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

/**
 * Get the current user's GitHub App configuration.
 */
app.get("/api/github/config", verifyToken, asyncHandler(async (req, res) => {
  const uid = req.user.uid;
  
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
 */
app.delete("/api/github/config", verifyToken, asyncHandler(async (req, res) => {
  const uid = req.user.uid;
  
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists || !userDoc.data().githubAppId) {
    const error = new Error('No GitHub configuration found to delete');
    error.status = 404;
    throw error;
  }

  const appId = userDoc.data().githubAppId;

  await db.runTransaction(async (transaction) => {
    const appDocRef = db.collection('github_apps').doc(appId);
    const userDocRef = db.collection('users').doc(uid);

    transaction.delete(appDocRef);
    transaction.update(userDocRef, {
      githubAppId: admin.firestore.FieldValue.delete()
    });
  });

  res.json({ success: true, message: 'GitHub integration removed successfully' });
}));

/**
 * Exchange GitHub App Manifest code for credentials and store them in Firestore.
 */
app.post("/api/github/finalize-setup", verifyToken, validateBody(finalizeSetupSchema), asyncHandler(async (req, res) => {
  const { code } = req.body;
  const uid = req.user.uid;

  const githubResponse = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json'
    }
  });

  if (!githubResponse.ok) {
    const error = new Error(`GitHub API error: ${githubResponse.status}`);
    error.status = 502;
    throw error;
  }

  const appConfig = await githubResponse.json();
  const appId = appConfig.id.toString();

  const secretName = await upsertSecret(appId, appConfig.pem);

  const githubData = {
    appId: appId,
    name: appConfig.name,
    webhookSecret: appConfig.webhook_secret,
    privateKeySecretName: secretName,
    useSecretManager: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ownerUid: uid,
    htmlUrl: appConfig.html_url
  };

  await db.runTransaction(async (transaction) => {
    const appDocRef = db.collection('github_apps').doc(githubData.appId);
    const userDocRef = db.collection('users').doc(uid);

    transaction.set(appDocRef, githubData);
    transaction.set(userDocRef, {
      githubAppId: githubData.appId
    }, { merge: true });
  });

  res.json({ 
    success: true, 
    appId: githubData.appId,
    installUrl: `${appConfig.html_url}/installations/new`
  });
}));

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

// A2A Aliases
a2aRouter.post("/v1/message:send", (req, res, next) => {
  req.url = "/rest/v1/message:send";
  next();
}, a2aRouter);

a2aRouter.get("/agent-card", (req, res, next) => {
  req.url = "/.well-known/agent-card.json";
  next();
}, a2aRouter);

app.use("/", a2aRouter);

// Global Error Handler
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

export default app;
