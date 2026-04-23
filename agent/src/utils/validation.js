// agent/src/utils/validation.js

import { URL } from 'url';
import logger from './logger.js';

/**
 * Validates a Git URL to prevent SSRF and Command Injection.
 * 
 * @param {string} urlString The URL to validate.
 * @returns {boolean} True if the URL is valid and safe.
 */
export function validateGitUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;

  try {
    // 1. Basic URL parsing
    const url = new URL(urlString);

    // 2. Protocol Check: Only allow https for now
    if (url.protocol !== 'https:') {
      logger.warn(`Invalid protocol rejected: ${url.protocol}`, { module: 'validation' });
      return false;
    }

    // 3. Domain Whitelist (Optional but recommended)
    const allowedDomains = [
      'github.com',
      'gitlab.com',
      'bitbucket.org',
      'googlesource.com'
    ];
    
    const isAllowedDomain = allowedDomains.some(domain => 
      url.hostname === domain || url.hostname.endsWith('.' + domain)
    );

    if (!isAllowedDomain) {
      logger.warn(`Unrecognized domain rejected: ${url.hostname}`, { module: 'validation' });
      // We might want to be more permissive, but for now let's be strict
      return false;
    }

    // 4. SSRF Check: Prevent local/private IP addresses
    // This is a simple check; in production use a dedicated library for IP validation
    const hostname = url.hostname.toLowerCase();
    const privateIpPatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local / Cloud Metadata
      /^0\.0\.0\.0$/,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ];

    if (privateIpPatterns.some(pattern => pattern.test(hostname))) {
      logger.warn(`Private/Internal IP rejected: ${hostname}`, { module: 'validation' });
      return false;
    }

    // 5. Argument Injection Check
    // Prevent URLs starting with '-' which might be interpreted as flags by git
    if (urlString.trim().startsWith('-')) {
      logger.warn('URL starting with dash rejected', { module: 'validation' });
      return false;
    }

    return true;
  } catch (error) {
    logger.error(`URL validation failed: ${error.message}`, { module: 'validation' });
    return false;
  }
}
