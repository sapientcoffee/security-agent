import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

export const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Custom winston format for Google Cloud Logging (GCL) compatibility.
 */
const gclFormat = winston.format((info) => {
  const store = asyncLocalStorage.getStore();
  
  // Map standard Winston level to GCL severity
  info.severity = info.level.toUpperCase();
  
  if (store) {
    if (store.traceId) {
      info['logging.googleapis.com/trace'] = store.traceId;
    }
    if (store.httpRequest) {
      info.httpRequest = store.httpRequest;
    }
    // Mixin all other context
    const { traceId: _traceId, httpRequest: _httpRequest, ...rest } = store;
    Object.assign(info, rest);
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    gclFormat(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ],
});

export default logger;
