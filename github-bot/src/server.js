// github-bot/src/server.js

/**
 * Entry point and webhook handler for the GitHub Security Bot.
 */

import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleAuth } from 'google-auth-library';
import { db, admin } from './lib/firebase.js';
import { GitHubService } from './github-service.js';
import { analyzeDiff } from './agent-client.js';
import { asyncHandler } from './utils/asyncHandler.js';
import logger, { asyncLocalStorage } from './utils/logger.js';

// Load environment variables
dotenv.config();

logger.info('>>> GitHub Security Bot Starting...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware for request correlation and logging
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

  const context = { 
    traceId: fullTraceId, 
    httpRequest,
    appId: req.headers['x-github-hook-installation-target-id']
  };
  
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

// Helper to retrieve GitHub App config from Firestore
async function getAppConfig(appId) {
  if (!appId) return null;
  const doc = await db.collection('github_apps').doc(appId.toString()).get();
  if (!doc.exists) {
    logger.error('No configuration found for App ID in Firestore', { appId });
    return null;
  }
  return doc.data();
}

// Serve the app creation manifest at the root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../create-app.html'));
});

// Handle the redirection after GitHub App creation
app.get('/setup-callback', asyncHandler(async (req, res) => {
  const code = req.query.code;
  
  if (!code) {
    const error = new Error('Missing code parameter');
    error.status = 400;
    throw error;
  }

  const response = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json'
    }
  });

  if (!response.ok) {
    const error = new Error(`GitHub API error: ${response.status} ${await response.text()}`);
    error.status = 502;
    throw error;
  }

  const appConfig = await response.json();
  const appId = appConfig.id.toString();
  const webhookSecret = appConfig.webhook_secret;
  const privateKey = appConfig.pem;

  logger.info('Converted GitHub Manifest code to credentials', { appId });

  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>App Setup Complete</title>
        <style>
            body { font-family: -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #24292e; text-align: center; }
            .card { border: 1px solid #e1e4e8; border-radius: 6px; padding: 40px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            h1 { color: #2ea44f; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>✅ Setup Complete!</h1>
            <p>Your personal security bot (ID: ${appId}) is now fully configured and live.</p>
            <p>The final step is to install the app on your repositories:</p>
            <a href="${appConfig.html_url}/installations/new" style="background: #2ea44f; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 20px;">Install Bot on Repositories</a>
            <button onClick="window.close()" class="block w-full text-sm text-gray-500 font-medium hover:underline mt-4">Close Window</button>
        </div>
    </body>
    </html>
  `);
}));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const verifySignature = asyncHandler(async (req, res, next) => {
  const signature = req.headers['x-hub-signature-256'];
  const appId = req.headers['x-github-hook-installation-target-id'];

  if (!signature) {
    const error = new Error('No signature provided');
    error.status = 401;
    return next(error);
  }

  let secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (appId) {
    const appConfig = await getAppConfig(appId);
    if (appConfig?.webhookSecret) {
      secret = appConfig.webhookSecret;
      req.appConfig = appConfig;
    }
  }

  if (!secret) {
    logger.error('Webhook secret not found for App ID', { appId });
    const error = new Error('Server configuration error');
    error.status = 500;
    return next(error);
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from('sha256=' + hmac.update(req.body).digest('hex'), 'utf8');
  const checksum = Buffer.from(signature, 'utf8');

  if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
    const error = new Error('Invalid signature');
    error.status = 401;
    return next(error);
  }

  next();
});

app.post('/api/webhook', express.raw({ type: 'application/json' }), verifySignature, asyncHandler(async (req, res) => {
  const event = req.headers['x-github-event'];
  const appId = req.headers['x-github-hook-installation-target-id'];
  
  if (event === 'ping') {
    return res.status(200).send('pong');
  }

  const payload = JSON.parse(req.body.toString('utf8'));

  // Handle Installation Events
  if (event === 'installation' || event === 'installation_repositories') {
    const repos = (payload.repositories || payload.repositories_added || []).map(r => r.full_name);
    logger.info('Updating installation status', { appId, repos });
    
    await db.collection('github_apps').doc(appId.toString()).set({
      installedAt: admin.firestore.FieldValue.serverTimestamp(),
      repositories: admin.firestore.FieldValue.arrayUnion(...repos)
    }, { merge: true });
    
    return res.status(200).send('Installation updated');
  }

  if (event !== 'pull_request') {
    return res.status(200).send('Ignored event type');
  }

  const action = payload.action;
  const isManualTrigger = action === 'labeled' && payload.label?.name === 'security-review';
  const isAutoTrigger = action === 'opened' || action === 'synchronize';

  if (isAutoTrigger || isManualTrigger) {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const pull_number = payload.pull_request.number;
    const installationId = payload.installation?.id;

    logger.info('Processing PR event', { owner, repo, pull_number, trigger: action, appId });
    
    // Update last triggered time in Firestore
    await db.collection('github_apps').doc(appId.toString()).set({
      lastTriggeredAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    const githubService = new GitHubService(
      req.appConfig?.appId || process.env.GITHUB_APP_ID,
      req.appConfig?.privateKey || process.env.GITHUB_PRIVATE_KEY,
      installationId
    );

    if (process.env.SKIP_BACKGROUND !== 'true') {
      const traceId = asyncLocalStorage.getStore()?.traceId;
      
      const processPromise = (async () => {
        try {
          logger.info('Fetching PR diff', { pull_number });
          const diff = await githubService.getPRDiff(owner, repo, pull_number);
          
          logger.info('Sending diff to Security Agent for analysis', { pull_number });
          const analysisResult = await analyzeDiff(diff, { 'X-Cloud-Trace-Context': traceId });
          
          const commitId = payload.pull_request.head.sha;
          logger.info('Creating PR review', { pull_number, commitId });
          
          await githubService.createReview(
            owner,
            repo,
            pull_number,
            commitId,
            analysisResult.summary,
            analysisResult.comments
          );

          logger.info('Successfully created PR review', { pull_number });

          // Record the review in Firestore history
          await db.collection('github_reviews').add({
            appId: appId.toString(),
            ownerUid: req.appConfig?.ownerUid,
            repo: `${owner}/${repo}`,
            pullNumber: pull_number,
            prUrl: payload.pull_request.html_url,
            summary: analysisResult.summary,
            commentCount: (analysisResult.comments || []).length,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });

          logger.info('Recorded review in history', { pull_number });
          } catch (error) {          logger.error('Error processing PR review', { pull_number, error: error.message, stack: error.stack });
        }
      })();
      app.emit('pr_process_promise', processPromise);
    }

    return res.status(202).send('Accepted');
  }

  res.status(200).send('Ignored PR action');
}));

app.use((err, req, res, next) => {
  logger.error('Internal Server Error', { error: err.message, stack: err.stack, status: err.status });
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info('GitHub Security Bot server listening', { port: PORT });
  });
}

export default app;
