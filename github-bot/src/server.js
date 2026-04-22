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
import { db } from './lib/firebase.js';
import { GitHubService } from './github-service.js';
import { analyzeDiff } from './agent-client.js';
import { asyncHandler } from './utils/asyncHandler.js';

// Load environment variables
dotenv.config();

console.info('>>> GitHub Security Bot Starting...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Helper to retrieve GitHub App config from Firestore
async function getAppConfig(appId) {
  if (!appId) return null;
  const doc = await db.collection('github_apps').doc(appId.toString()).get();
  if (!doc.exists) {
    console.error(`>>> No configuration found for App ID: ${appId}`);
    return null;
  }
  return doc.data();
}

// Function to update Cloud Run environment variables
async function updateCloudRunConfig(newEnv) {
  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
  });
  const client = await auth.getClient();
  const projectId = await auth.getProjectId();
  const serviceName = 'github-security-bot';
  const region = 'us-central1';
  
  // 1. Get current service configuration
  const url = `https://${region}-run.googleapis.com/v2/projects/${projectId}/locations/${region}/services/${serviceName}`;
  const getResponse = await client.request({ url });
  const service = getResponse.data;

  // 2. Prepare new environment variables
  const newEnvArray = Object.entries(newEnv).map(([name, value]) => ({ name, value }));
  
  const currentEnv = service.template.containers[0].env || [];
  const updatedEnv = [...currentEnv];
  
  for (const newVar of newEnvArray) {
    const index = updatedEnv.findIndex(v => v.name === newVar.name);
    if (index !== -1) {
      updatedEnv[index] = newVar;
    } else {
      updatedEnv.push(newVar);
    }
  }

  // 3. Update the service
  service.template.containers[0].env = updatedEnv;
  
  delete service.status;
  delete service.uri;
  delete service.reconciling;
  delete service.etag;
  delete service.uid;
  delete service.createTime;
  delete service.updateTime;
  delete service.deleteTime;
  delete service.expireTime;
  delete service.creator;
  delete service.lastModifier;

  console.info(`>>> Updating Cloud Run service ${serviceName} with new credentials...`);
  await client.request({
    url,
    method: 'PATCH',
    data: service
  });
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

  if (process.env.K_SERVICE) {
    updateCloudRunConfig({
      GITHUB_APP_ID: appId,
      GITHUB_WEBHOOK_SECRET: webhookSecret,
      GITHUB_PRIVATE_KEY: privateKey
    }).catch(err => console.error('>>> Auto-update failed:', err));
  }

  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>App Setup Complete</title>
        <style>
            body { font-family: -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #24292e; text-align: center; }
            .card { border: 1px solid #e1e4e8; border-radius: 6px; padding: 40px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .loader { border: 4px solid #f3f3f3; border-top: 4px solid #2ea44f; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h1 { color: #2ea44f; }
            .success-content { display: none; }
        </style>
    </head>
    <body>
        <div class="card">
            <div id="loading">
                <h1>⚙️ Configuring Your Bot...</h1>
                <p>We've received your GitHub credentials. The bot is now automatically updating its own configuration in Cloud Run.</p>
                <div class="loader"></div>
                <p><small>This will trigger a service restart. Please wait about 30 seconds.</small></p>
            </div>

            <div id="success" class="success-content">
                <h1>✅ Setup Complete!</h1>
                <p>Your bot is now fully configured and live.</p>
                <p>The final step is to install the app on your repositories:</p>
                <a href="${appConfig.html_url}/installations/new" style="background: #2ea44f; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 20px;">Install Bot on Repositories</a>
            </div>
        </div>

        <script>
            setTimeout(() => {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('success').style.display = 'block';
            }, 15000);
        </script>
    </body>
    </html>
  `);
}));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
// Webhook verification middleware
const verifySignature = asyncHandler(async (req, res, next) => {
  const signature = req.headers['x-hub-signature-256'];
  const appId = req.headers['x-github-hook-installation-target-id'];

  if (!signature) {
    const error = new Error('No signature provided');
    error.status = 401;
    return next(error);
  }

  // 1. Get Secret from Environment (Global) or Firestore (Multi-tenant)
  let secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (appId) {
    const appConfig = await getAppConfig(appId);
    if (appConfig?.webhookSecret) {
      secret = appConfig.webhookSecret;
      // Attach config to request for later use
      req.appConfig = appConfig;
    }
  }

  if (!secret) {
    console.error('>>> GITHUB_WEBHOOK_SECRET not found for App ID:', appId);
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
  console.info(`>>> Received webhook: event=${event}`);
  
  if (event === 'ping') {
    return res.status(200).send('pong');
  }

  if (event !== 'pull_request') {
    return res.status(200).send('Ignored event type');
  }

  const payload = JSON.parse(req.body.toString('utf8'));
  const action = payload.action;

  const isManualTrigger = action === 'labeled' && payload.label?.name === 'security-review';
  const isAutoTrigger = action === 'opened' || action === 'synchronize';

  if (isAutoTrigger || isManualTrigger) {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const pull_number = payload.pull_request.number;
    const installationId = payload.installation?.id;

    console.info(`>>> PROCESSING: owner=${owner}, repo=${repo}, pull_number=${pull_number}, installationId=${installationId}, trigger=${action}`);
    
    const githubService = new GitHubService(
      req.appConfig?.appId || process.env.GITHUB_APP_ID,
      req.appConfig?.privateKey || process.env.GITHUB_PRIVATE_KEY,
      installationId
    );

    if (process.env.SKIP_BACKGROUND !== 'true') {
      const processPromise = (async () => {
        try {
          console.info(`>>> Fetching PR diff for #${pull_number}...`);
          const diff = await githubService.getPRDiff(owner, repo, pull_number);
          
          console.info(`>>> Sending diff to Security Agent for analysis...`);
          const analysisResult = await analyzeDiff(diff);
          
          const commitId = payload.pull_request.head.sha;
          console.info(`>>> Creating PR review for commit ${commitId}...`);
          
          await githubService.createReview(
            owner,
            repo,
            pull_number,
            commitId,
            analysisResult.summary,
            analysisResult.comments
          );
          
          console.info(`>>> Successfully created PR review for #${pull_number}`);
        } catch (error) {
          console.error(`>>> Error processing PR #${pull_number}:`, error);
        }
      })();
      app.emit('pr_process_promise', processPromise);
    }

    return res.status(202).send('Accepted');
  }

  res.status(200).send('Ignored PR action');
}));

app.use((err, req, res, next) => {
  console.error('>>> Error Handler:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.info(`>>> GitHub Security Bot server listening on port ${PORT}`);
  });
}

export default app;
