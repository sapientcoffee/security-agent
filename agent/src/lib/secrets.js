import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import logger from '../utils/logger.js';

const client = new SecretManagerServiceClient();
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;

/**
 * Creates or updates a secret version in Secret Manager.
 * @param {string} appId The GitHub App ID.
 * @param {string} pemContent The PEM-formatted private key.
 * @returns {Promise<string>} The full name of the secret version.
 */
export async function upsertSecret(appId, pemContent) {
  if (!PROJECT_ID) {
    throw new Error('GOOGLE_CLOUD_PROJECT environment variable is not set');
  }

  const secretId = `gh-app-${appId}-key`;
  const parent = `projects/${PROJECT_ID}`;
  const secretName = `${parent}/secrets/${secretId}`;

  try {
    // Check if secret exists
    try {
      await client.getSecret({ name: secretName });
      logger.info(`Secret ${secretId} already exists, creating new version`);
    } catch (error) {
      if (error.code === 5) { // NOT_FOUND
        logger.info(`Creating new secret ${secretId}`);
        await client.createSecret({
          parent,
          secretId,
          secret: {
            replication: {
              automatic: {},
            },
          },
        });
      } else {
        throw error;
      }
    }

    // Add a new secret version
    const [version] = await client.addSecretVersion({
      parent: secretName,
      payload: {
        data: Buffer.from(pemContent, 'utf8'),
      },
    });

    logger.info(`Successfully added new version to secret ${secretId}`, { version: version.name });
    return secretName; // We store the secret name, not the version, so we can always fetch 'latest'
  } catch (error) {
    logger.error(`Error upserting secret ${secretId} to Secret Manager`, { error: error.message });
    throw error;
  }
}

/**
 * Accesses a secret version's data.
 * @param {string} secretName The full name of the secret (e.g. projects/.../secrets/...)
 * @param {string} version The version to fetch (defaults to 'latest')
 * @returns {Promise<string>} The secret payload string.
 */
export async function getSecret(secretName, version = 'latest') {
  try {
    const name = `${secretName}/versions/${version}`;
    const [response] = await client.accessSecretVersion({ name });
    const payload = response.payload.data.toString('utf8');
    return payload;
  } catch (error) {
    logger.error(`Error accessing secret ${secretName} from Secret Manager`, { error: error.message });
    throw error;
  }
}
