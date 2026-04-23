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
    // Map requestId to GCL trace field for better correlation
    // Format: projects/[PROJECT_ID]/traces/[TRACE_ID]
    if (store.traceId) {
      info['logging.googleapis.com/trace'] = store.traceId;
    }
    // Support GCL's standard httpRequest object
    if (store.httpRequest) {
      info.httpRequest = store.httpRequest;
    }
    // Keep other metadata
    const { traceId: _traceId, httpRequest: _httpRequest, ...rest } = store;
    if (Object.keys(rest).length > 0) {
      Object.assign(info, rest);
    }
  }
  return info;
});

const transports = [];

// In Cloud Run environment, stdout is captured as text.
// Using LoggingWinston directly ensures logs are structured for Cloud Logging.
if (process.env.K_SERVICE) {
  transports.push(new LoggingWinston({
    labels: { service: 'github-security-bot' },
    logName: 'github-bot-logs',
  }));
} else {
  // Console transport for local development
  transports.push(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    contextFormat(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports,
});

export default logger;
