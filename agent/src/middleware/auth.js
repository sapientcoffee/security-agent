import { admin } from '../lib/firebase.js';
// TODO: import asyncHandler if available or handle natively

/**
 * Express middleware to verify Firebase ID token
 * and attach decoded user payload to req.user
 */
export const verifyToken = async (req, res, next) => {
  // TODO: Extract token, verify via admin.auth().verifyIdToken()
  // Throw 401 error using project standard on failure
  next();
};
