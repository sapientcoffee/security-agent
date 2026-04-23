// agent/src/middleware/validate.js

import { z } from 'zod';

/**
 * Middleware to validate request body against a Zod schema.
 */
export const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      });
    }
    next(error);
  }
};

/**
 * Common Schemas
 */

export const analyzeSchema = z.object({
  inputType: z.enum(['git', 'text']).default('text'),
  content: z.string().min(1, 'Content is required'),
  structured: z.boolean().optional().default(false)
});

export const messageSendSchema = z.object({
  text: z.string().optional(),
  message: z.object({
    content: z.union([
      z.string(),
      z.array(z.object({ text: z.string().optional() }))
    ]).optional(),
    text: z.string().optional()
  }).optional()
}).refine(data => data.text || data.message, {
  message: "Either 'text' or 'message' must be provided"
});

export const finalizeSetupSchema = z.object({
  code: z.string().min(1, 'Code is required')
});
