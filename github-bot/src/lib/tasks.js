import { CloudTasksClient } from '@google-cloud/tasks';
import logger from '../utils/logger.js';

const client = new CloudTasksClient();

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const LOCATION = process.env.CLOUD_TASKS_LOCATION || 'us-central1';
const QUEUE = process.env.CLOUD_TASKS_QUEUE || 'pr-analysis-queue';
const BOT_URL = process.env.BOT_URL;
const SERVICE_ACCOUNT_EMAIL = process.env.TASK_SERVICE_ACCOUNT;

/**
 * Enqueues a PR analysis task.
 * @param {object} payload The webhook payload.
 * @param {string} appId The GitHub App ID.
 * @param {object} appConfig The app configuration from Firestore.
 * @param {string} traceId The trace ID for correlation.
 */
export async function enqueueAnalysis(payload, appId, appConfig, traceId) {
  if (!BOT_URL) {
    logger.warn('BOT_URL not set, cannot enqueue task. Falling back to local execution.');
    return null;
  }

  const parent = client.queuePath(PROJECT_ID, LOCATION, QUEUE);
  const url = `${BOT_URL}/task/process-pr`;

  const taskPayload = {
    payload,
    appId,
    appConfig,
    traceId
  };

  const task = {
    httpRequest: {
      httpMethod: 'POST',
      url,
      headers: {
        'Content-Type': 'application/json',
        'X-Cloud-Trace-Context': traceId
      },
      body: Buffer.from(JSON.stringify(taskPayload)).toString('base64'),
      oidcToken: {
        serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
      },
    },
  };

  try {
    logger.info('Enqueuing PR analysis task', { appId, pull_number: payload.pull_request?.number });
    const [response] = await client.createTask({ parent, task });
    logger.info('Successfully enqueued task', { taskName: response.name });
    return response.name;
  } catch (error) {
    logger.error('Error enqueuing task', { error: error.message });
    throw error;
  }
}
