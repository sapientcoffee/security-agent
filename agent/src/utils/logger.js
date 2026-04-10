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
    if (store.requestId) {
      info['logging.googleapis.com/trace'] = store.requestId.replace(/-/g, '');
    }
    // Support GCL's standard httpRequest object
    if (store.httpRequest) {
      info.httpRequest = store.httpRequest;
    }
    // Keep other metadata in reqContext
    const { requestId: _requestId, httpRequest: _httpRequest, ...rest } = store;
    if (Object.keys(rest).length > 0) {
      info.reqContext = rest;
    }
  }
  return info;
});

const transports = [];

// Avoid duplicate logs in Cloud Logging (stdout is already ingested as text)
// When in production, use the dedicated Cloud Logging transport via API.
if (process.env.NODE_ENV === 'production') {
  transports.push(new LoggingWinston({
    labels: { service: 'security-audit-agent' },
    logName: 'agent-logs',
  }));
} else {
  // Console transport for local/development/test environments
  transports.push(new winston.transports.Console());
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
