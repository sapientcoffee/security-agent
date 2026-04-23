import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import logger from '../utils/logger.js';

const client = new SecretManagerServiceClient();

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
