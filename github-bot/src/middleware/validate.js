// github-bot/src/middleware/validate.js

import { z } from 'zod';

export const validateBody = (schema) => (req, res, next) => {
  try {
    // For raw body (webhooks), we parse it if it's a buffer/string
    let body = req.body;
    if (Buffer.isBuffer(body)) {
      body = JSON.parse(body.toString('utf8'));
    }
    
    req.body = schema.parse(body);
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

export const taskProcessPrSchema = z.object({
  payload: z.object({
    repository: z.object({
      owner: z.object({ login: z.string() }),
      name: z.string()
    }),
    pull_request: z.object({
      number: z.number(),
      html_url: z.string(),
      head: z.object({ sha: z.string() })
    }),
    installation: z.object({ id: z.number() }).optional()
  }),
  appId: z.union([z.string(), z.number()]),
  appConfig: z.object({
    appId: z.string(),
    privateKey: z.string().optional(),
    ownerUid: z.string()
  }),
  traceId: z.string().optional()
});
