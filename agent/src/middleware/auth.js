import { admin } from '../lib/firebase.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { OAuth2Client } from 'google-auth-library';
import { asyncLocalStorage } from '../utils/logger.js';

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
  
  let user = null;
  try {
    user = await admin.auth().verifyIdToken(token);
  } catch (firebaseErr) {
    try {
      const ticket = await client.verifyIdToken({
        idToken: token
      });
      const payload = ticket.getPayload();
      user = {
        ...payload,
        uid: payload.sub // Ensure 'uid' exists for consistency with Firebase payload
      };
    } catch (googleErr) {
      const error = new Error('Unauthorized: Invalid token');
      error.status = 401;
      throw error;
    }
  }

  req.user = user;

  // Inject UID into the logger's context store for trace correlation
  const store = asyncLocalStorage.getStore();
  if (store) {
    store.uid = user.uid;
  }

  return next();
});
