/**
 * otel.ts — preparação de instrumentação OpenTelemetry para o frontend.
 *
 * ── STATUS: ESTRUTURA PREPARADA, NÃO FUNCIONAL SEM CONFIGURAÇÃO ──────────
 *
 * Este módulo define a interface e os pontos de integração para rastreamento
 * distribuído. A instrumentação real requer alinhamento com a equipe de
 * observabilidade nos seguintes pontos (tarefa D5/D9):
 *
 *   1. Endpoint de exportação OTLP (OTEL_EXPORTER_OTLP_ENDPOINT)
 *      — URL do Collector ou endpoint direto do Grafana Tempo/Jaeger.
 *      — Precisa estar acessível via CORS pelo navegador.
 *
 *   2. Cabeçalhos de propagação (traceparent / tracestate)
 *      — O backend precisa aceitar e continuar o span com os mesmos cabeçalhos.
 *      — O nginx (nginx.conf) tem placeholder comentado para proxy_set_header.
 *
 *   3. SDK a instalar (quando endpoint estiver definido):
 *      npm install @opentelemetry/sdk-trace-web@^1 \
 *                  @opentelemetry/instrumentation-fetch@^0 \
 *                  @opentelemetry/exporter-trace-otlp-http@^0 \
 *                  @opentelemetry/context-zone@^1 \
 *                  @opentelemetry/propagator-b3@^1
 *
 *   4. Política de privacidade:
 *      — Não registrar URLs com tokens, senhas ou dados pessoais.
 *      — Filtrar atributos antes de exportar (ver sanitizeUrl abaixo).
 *
 * ── Como ativar (quando pronto) ──────────────────────────────────────────
 *   .env.production:
 *     VITE_OTEL_ENABLED=true
 *     VITE_OTEL_SERVICE_NAME=encolhe-frontend
 *     VITE_OTEL_EXPORTER_URL=https://seu-collector/v1/traces
 *
 * ── Como está agora ───────────────────────────────────────────────────────
 *   VITE_OTEL_ENABLED não definido = false → nenhuma telemetria exportada.
 *   api.ts usa wrapFetch() que, sem SDK instalado, passa diretamente para
 *   o fetch nativo — sem custo, sem imports de SDK.
 */

// ── Configuração por variável de ambiente ─────────────────────────────────

export const OTEL_ENABLED: boolean =
  import.meta.env.VITE_OTEL_ENABLED === 'true';

export const OTEL_SERVICE_NAME: string =
  (import.meta.env.VITE_OTEL_SERVICE_NAME as string | undefined) ??
  'encolhe-frontend';

export const OTEL_EXPORTER_URL: string =
  (import.meta.env.VITE_OTEL_EXPORTER_URL as string | undefined) ?? '';

// ── Utilitário de sanitização de URLs ─────────────────────────────────────

/**
 * Remove parâmetros potencialmente sensíveis de uma URL antes de registrar
 * em telemetria. Preserva o caminho e parâmetros não sensíveis.
 *
 * Expansível: adicionar mais chaves conforme necessidade.
 */
const SENSITIVE_PARAMS = new Set([
  'token', 'access_token', 'password', 'secret', 'key', 'api_key',
  'authorization', 'auth', 'credential', 'session',
]);

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    // Iteração compatível com lib DOM mesmo sem DOM.Iterable no tsconfig.
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
 * Inicializa a instrumentação OpenTelemetry.
 *
 * Chamada em main.tsx quando VITE_OTEL_ENABLED=true.
 * Atualmente um no-op — será implementada após alinhamento com a equipe.
 *
 * Quando o SDK for instalado, este será o ponto de configuração de:
 *   - TracerProvider com BatchSpanProcessor
 *   - OTLPTraceExporter apontando para OTEL_EXPORTER_URL
 *   - FetchInstrumentation com sanitização de URLs
 *   - Propagadores W3C TraceContext + B3 (conforme decisão da equipe)
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

  // TODO (D5 — após alinhamento com equipe de observabilidade):
  //
  // import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
  // import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
  // import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
  // import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
  // import { ZoneContextManager } from '@opentelemetry/context-zone';
  // import { W3CTraceContextPropagator } from '@opentelemetry/core';
  //
  // const provider = new WebTracerProvider({
  //   resource: new Resource({ 'service.name': OTEL_SERVICE_NAME }),
  // });
  //
  // provider.addSpanProcessor(
  //   new BatchSpanProcessor(
  //     new OTLPTraceExporter({
  //       url: OTEL_EXPORTER_URL,
  //       // headers: {} — adicionar se o Collector exigir autenticação
  //     }),
  //   ),
  // );
  //
  // provider.register({
  //   contextManager: new ZoneContextManager(),
  //   propagator: new W3CTraceContextPropagator(),
  // });
  //
  // registerInstrumentations({
  //   instrumentations: [
  //     new FetchInstrumentation({
  //       // Não capturar o corpo das requisições — pode conter dados pessoais
  //       applyCustomAttributesOnSpan: (span, request) => {
  //         // Sanitiza URL antes de registrar como atributo
  //         const url = typeof request === 'string' ? request : request.url;
  //         span.setAttribute('http.url', sanitizeUrl(url));
  //       },
  //     }),
  //   ],
  // });

  console.info(
    `[OTel] Instrumentação preparada (service: ${OTEL_SERVICE_NAME}). ` +
    'SDK não instalado — descomente o código acima após instalar os pacotes.',
  );
}

// ── Tipo auxiliar para spans manuais (futuro) ─────────────────────────────

/**
 * Interface mínima de span para uso no api.ts sem depender do SDK instalado.
 * Quando o SDK estiver ativo, os spans reais serão criados automaticamente
 * pela FetchInstrumentation — este tipo serve apenas para spans manuais opcionais.
 */
export interface SpanLike {
  setAttribute(key: string, value: string | number | boolean): void;
  setStatus(status: { code: number; message?: string }): void;
  end(): void;
}

/** No-op span — usado quando OTel não está ativo. */
export const noopSpan: SpanLike = {
  setAttribute: () => undefined,
  setStatus: () => undefined,
  end: () => undefined,
};
