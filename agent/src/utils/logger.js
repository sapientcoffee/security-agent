import winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage to hold request-scoped context (like requestId)
export const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Custom winston format that merges the data from AsyncLocalStorage
 * into the log metadata.
 */
const contextFormat = winston.format((info) => {
  const store = asyncLocalStorage.getStore();
  if (store) {
    // Merge context from store into the log info object
    return Object.assign(info, store);
  }
  return info;
});

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      contextFormat(),
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

// Add Google Cloud Logging transport if not in development or if specifically requested
if (process.env.NODE_ENV === 'production') {
  transports.push(new LoggingWinston({
    prefix: 'security-audit-agent',
    logName: 'agent-logs',
  }));
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports,
});

export default logger;
