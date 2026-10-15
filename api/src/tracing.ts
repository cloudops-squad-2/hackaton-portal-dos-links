import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
});

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'portal-dos-links-api',
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy fs instrumentation; keep HTTP, Fastify, pg (Prisma)
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

// Graceful shutdown: flush spans before the process exits
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .finally(() => process.exit(0));
});
