// github-bot/src/server.js

/**
 * Entry point and webhook handler for the GitHub Security Bot.
 */

import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { GitHubService } from './github-service.js';
import { analyzeDiff } from './agent-client.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Webhook verification middleware
const verifySignature = (req, res, next) => {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).send('No signature provided');
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error('GITHUB_WEBHOOK_SECRET is not set');
    return res.status(500).send('Server configuration error');
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from('sha256=' + hmac.update(req.body).digest('hex'), 'utf8');
  const checksum = Buffer.from(signature, 'utf8');

  if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
    return res.status(401).send('Invalid signature');
  }

  next();
};

// Route POST /api/webhook
// Using express.raw to ensure we can verify the signature with the raw payload
app.post('/api/webhook', express.raw({ type: 'application/json' }), verifySignature, (req, res) => {
  const event = req.headers['x-github-event'];
  
  if (event === 'ping') {
    return res.status(200).send('pong');
  }

  if (event !== 'pull_request') {
    return res.status(200).send('Ignored event type');
  }

  try {
    const payload = JSON.parse(req.body.toString('utf8'));
    const action = payload.action;

    if (action === 'opened' || action === 'synchronize') {
      const owner = payload.repository.owner.login;
      const repo = payload.repository.name;
      const pull_number = payload.pull_request.number;
      const installationId = payload.installation?.id;

      console.log(`Received PR event: owner=${owner}, repo=${repo}, pull_number=${pull_number}, installationId=${installationId}`);
      
      // Initialize GitHub Service using the installation ID
      const githubService = new GitHubService(
        process.env.GITHUB_APP_ID,
        process.env.GITHUB_PRIVATE_KEY,
        installationId
      );

      // Async process in background
      if (process.env.SKIP_BACKGROUND !== 'true') {
        const processPromise = (async () => {
          try {
            console.log(`Fetching PR diff for #${pull_number}...`);
            const diff = await githubService.getPRDiff(owner, repo, pull_number);
            
            console.log(`Sending diff to Security Agent for analysis...`);
            const analysisResult = await analyzeDiff(diff);
            
            console.log(`Analysis Results for #${pull_number}:`, JSON.stringify(analysisResult, null, 2));

            const commitId = payload.pull_request.head.sha;
            console.log(`Creating PR review for commit ${commitId}...`);
            
            await githubService.createReview(
              owner,
              repo,
              pull_number,
              commitId,
              analysisResult.summary,
              analysisResult.comments
            );
            
            console.log(`Successfully created PR review for #${pull_number}`);
          } catch (error) {
            console.error(`Error processing PR #${pull_number}:`, error);
          }
        })();
        app.emit('pr_process_promise', processPromise);
      }

      return res.status(202).send('Accepted');
    }

    res.status(200).send('Ignored PR action');
  } catch (err) {
    console.error('Error parsing webhook payload:', err);
    res.status(400).send('Bad Request');
  }
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`GitHub Security Bot server listening on port ${PORT}`);
  });
}

export default app;
