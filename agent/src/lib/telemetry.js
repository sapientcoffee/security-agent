import { maybeSetOtelProviders, getGcpExporters } from '@google/adk';

/**
 * Initializes OpenTelemetry with Google Cloud Trace and Metrics.
 */
export async function initTelemetry() {
  try {
    const gcpExporters = await getGcpExporters({
      enableTracing: process.env.ENABLE_TRACING !== 'false',
      enableMetrics: process.env.ENABLE_METRICS !== 'false',
    });

    // maybeSetOtelProviders expects an array of hooks
    maybeSetOtelProviders([gcpExporters]);
  } catch (error) {
    console.error("Failed to initialize telemetry:", error);
  }
}
