import { maybeSetOtelProviders, getGcpExporters } from '@google/adk';

export function initTelemetry() {
  const exporters = getGcpExporters();

  const enableTracing = process.env.ENABLE_TRACING === 'true' || process.env.NODE_ENV !== 'production';
  const enableMetrics = process.env.ENABLE_METRICS === 'true' || process.env.NODE_ENV !== 'production';

  if (enableTracing || enableMetrics) {
    maybeSetOtelProviders({
      traceExporter: enableTracing ? exporters.traceExporter : undefined,
      metricExporter: enableMetrics ? exporters.metricExporter : undefined,
    });
  }
}
