// github-bot/src/middleware/auth.js

import { OAuth2Client } from 'google-auth-library';
import logger from '../utils/logger.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const client = new OAuth2Client();

/**
 * Express middleware to verify Google Identity (OIDC) token from Cloud Tasks
 * and attach decoded payload to req.user
 */
export const verifyTaskToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.error('Unauthorized: Missing or invalid token format', { 
      hasHeader: !!authHeader,
      isBearer: authHeader?.startsWith('Bearer ') 
    });
    const error = new Error('Unauthorized: Missing or invalid token format');
    error.status = 401;
    throw error;
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Verify the OIDC token from Google
    // Cloud Tasks sends this token when configured with oidcToken.
    const ticket = await client.verifyIdToken({
      idToken: token,
      // We could optionally verify the audience (aud) here if we know the bot's URL
      // audience: process.env.BOT_URL 
    });
    const payload = ticket.getPayload();
    
    // Attach payload to request for later use
    req.user = payload;
    
    logger.info('Task token verified', { email: payload.email });
    return next();
  } catch (err) {
    logger.error('Unauthorized: Invalid task token', { error: err.message });
    const error = new Error('Unauthorized: Invalid token');
    error.status = 401;
    throw error;
  }
});
