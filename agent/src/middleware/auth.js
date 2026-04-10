import { admin } from '../lib/firebase.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();

/**
 * Express middleware to verify Firebase ID token or Google Identity (OIDC) token
 * and attach decoded user payload to req.user
 */
export const verifyToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Unauthorized: Missing or invalid token format');
    error.status = 401;
    throw error;
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    return next();
  } catch (firebaseErr) {
    try {
      const ticket = await client.verifyIdToken({
        idToken: token
      });
      const payload = ticket.getPayload();
      req.user = {
        ...payload,
        uid: payload.sub // Ensure 'uid' exists for consistency with Firebase payload
      };
      return next();
    } catch (googleErr) {
      const error = new Error('Unauthorized: Invalid token');
      error.status = 401;
      throw error;
    }
  }
});
