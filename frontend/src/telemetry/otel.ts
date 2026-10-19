/**
 * otel.ts — instrumentação OpenTelemetry para o frontend (browser).
 *
 * Ativa o rastreamento distribuído que o desafio REQ-OBS-02 exige:
 *   frontend → API → banco.
 *
 * O fluxo de propagação funciona assim:
 *   1. A FetchInstrumentação envelopa toda chamada `fetch` e cria um span
 *      cliente (`HTTP GET/POST`).
 *   2. O propagador W3C TraceContext injeta o cabeçalho `traceparent`
 *      (e `tracestate`, se houver) na requisição antes de enviá-la.
 *   3. A API (auto-instrumentação Node) extrai esse `traceparent` e cria
 *      o span do servidor como filho do span do frontend — a mesma trace.
 *   4. A instrumentação do Prisma/pg cria o span do banco como filho do
 *      span do servidor. O trace atravessa as três camadas.
 *
 * Endpoint de exportação (OTLP/HTTP, porta 4318 do Collector):
 *   O Collector expõe OTLP/HTTP em /v1/traces. O navegador precisa de
 *   CORS habilitado no receiver — ver otel-collector-config.yaml.
 *
 * Variáveis de ambiente (prefixo VITE_ vai para o bundle):
 *   VITE_OTEL_ENABLED         — "true" liga a instrumentação.
 *   VITE_OTEL_SERVICE_NAME    — nome do serviço no trace (default: encolhe-frontend).
 *   VITE_OTEL_EXPORTER_URL    — URL OTLP/HTTP do Collector (default: http://localhost:4318/v1/traces).
 */

import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { Resource } from '@opentelemetry/resources';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

// ── Configuração por variável de ambiente ─────────────────────────────────

export const OTEL_ENABLED: boolean =
  import.meta.env.VITE_OTEL_ENABLED === 'true';

export const OTEL_SERVICE_NAME: string =
  (import.meta.env.VITE_OTEL_SERVICE_NAME as string | undefined) ??
  'encolhe-frontend';

// Default aponta para o Collector local exposto em :4318 (docker-compose).
export const OTEL_EXPORTER_URL: string =
  (import.meta.env.VITE_OTEL_EXPORTER_URL as string | undefined) ??
  'http://localhost:4318/v1/traces';

// ── Utilitário de sanitização de URLs ─────────────────────────────────────

/**
 * Remove parâmetros potencialmente sensíveis de uma URL antes de registrar
 * em telemetria. Preserva o caminho e parâmetros não sensíveis.
 */
const SENSITIVE_PARAMS = new Set([
  'token', 'access_token', 'password', 'secret', 'key', 'api_key',
  'authorization', 'auth', 'credential', 'session',
]);

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.forEach((_value, key) => {
      if (SENSITIVE_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.set(key, '[REDACTED]');
      }
    });
    return parsed.toString();
  } catch {
    return '[URL inválida]';
  }
}

// ── Inicialização do SDK ───────────────────────────────────────────────────

/**
 * Inicializa a instrumentação OpenTelemetry no browser.
 *
 * Deve ser chamada em main.tsx antes de montar a árvore React. Quando
 * VITE_OTEL_ENABLED != "true", é um no-op (sem custo em produção).
 */
export function initOtel(): void {
  if (!OTEL_ENABLED) return;

  if (!OTEL_EXPORTER_URL) {
    console.warn(
      '[OTel] VITE_OTEL_ENABLED=true mas VITE_OTEL_EXPORTER_URL não definido. ' +
      'Instrumentação desabilitada. Defina o endpoint do Collector.',
    );
    return;
  }

  const provider = new WebTracerProvider({
    resource: new Resource({
      'service.name': OTEL_SERVICE_NAME,
    }),
  });

  provider.addSpanProcessor(
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: OTEL_EXPORTER_URL,
        // O Collector local não exige autenticação; adicionar headers aqui
        // se o endpoint for protegido em produção.
      }),
    ),
  );

  provider.register({
    contextManager: new ZoneContextManager(),
    // W3C TraceContext é o propagador padrão da web — injeta `traceparent`.
    propagator: new W3CTraceContextPropagator(),
  });

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        // Propaga `traceparent` automaticamente: basta o propagador
        // registrado acima. A instrumentação envelopa `window.fetch`.
        applyCustomAttributesOnSpan: (span, request) => {
          // `request` pode ser um URL string, Request ou RequestInit.
          const rawUrl =
            typeof request === 'string'
              ? request
              : 'url' in request
                ? request.url
                : '';
          if (rawUrl) {
            // Sanitiza URL antes de registrar como atributo (privacidade).
            span.setAttribute('http.url', sanitizeUrl(rawUrl));
          }
          // Marca o componente para facilitar o filtro no Grafana/Jaeger.
          span.setAttribute('component', 'fetch');
        },
      }),
    ],
  });

  console.info(
    `[OTel] Instrumentação ativa (service: ${OTEL_SERVICE_NAME}, ` +
    `exporter: ${OTEL_EXPORTER_URL}). traceparent propagado para a API.`,
  );
}

// ── Tipo auxiliar para spans manuais (futuro) ─────────────────────────────

export interface SpanLike {
  setAttribute(key: string, value: string | number | boolean): void;
  setStatus(status: { code: number; message?: string }): void;
  end(): void;
}

export const noopSpan: SpanLike = {
  setAttribute: () => undefined,
  setStatus: () => undefined,
  end: () => undefined,
};
