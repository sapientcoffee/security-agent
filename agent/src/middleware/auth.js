import { admin } from '../lib/firebase.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Express middleware to verify Firebase ID token
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
    next();
  } catch (err) {
    const error = new Error('Unauthorized: Invalid token');
    error.status = 401;
    throw error;
  }
});
