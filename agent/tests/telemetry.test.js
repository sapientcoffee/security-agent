import { describe, it, expect, vi, beforeEach } from 'vitest';
import { maybeSetOtelProviders, getGcpExporters } from '@google/adk';

// Mock the ADK telemetry functions
vi.mock('@google/adk', () => ({
  maybeSetOtelProviders: vi.fn(),
  getGcpExporters: vi.fn().mockReturnValue({ traceExporter: {}, metricExporter: {} }),
}));

describe('Telemetry Bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize telemetry using ADK functions', async () => {
    // We import the telemetry module dynamically so the mocks are applied first
    const { initTelemetry } = await import('../src/lib/telemetry.js');
    
    initTelemetry();

    // Verify ADK methods were called to set up OpenTelemetry
    expect(getGcpExporters).toHaveBeenCalled();
    expect(maybeSetOtelProviders).toHaveBeenCalled();
  });
});
