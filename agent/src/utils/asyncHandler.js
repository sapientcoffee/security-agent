/**
 * Wrapper for async express routes/middleware to catch errors and pass them to next()
 */
export const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};
