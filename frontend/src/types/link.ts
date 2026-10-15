/**
 * link.ts — tipos de transporte da API do Encolhe!
 *
 * Estes tipos refletem o contrato atual confirmado com o backend.
 * Campos futuros (displayName, mode, customCode, maxClicks) ainda não
 * existem na API e estão marcados como comentário para referência.
 *
 * Contrato confirmado (outubro/2026):
 *   POST /api/links  → { url, expiresIn? }
 *   GET  /api/links  → { data: LinkItem[], meta: PaginationMeta }
 *   GET  /:code      → redirecionamento HTTP
 */

// ── Resposta de um link ────────────────────────────────────────────────────

/** Representa um link retornado pela API. */
export interface LinkItem {
  id:          string;
  code:        string;
  originalUrl: string;
  clickCount:  number;
  createdAt:   string; // ISO 8601
  expiresAt:   string | null;

  // Campos pendentes de implementação no backend (tarefa A4):
  // displayName?: string;
  // mode?:        'mini' | 'micro' | 'nano';
  // maxClicks?:   number;
}

// ── Corpo da requisição POST /api/links ────────────────────────────────────

/**
 * Corpo enviado para criar um link.
 *
 * Somente `url` e `expiresIn` fazem parte do contrato atual.
 * `expiresIn` é em segundos; omitir para "nunca expira".
 * Intervalo aceito: 60–2592000 (1 min – 30 dias).
 *
 * NÃO enviar campos desconhecidos — a API os rejeita.
 */
export interface CreateLinkBody {
  url:        string;
  expiresIn?: number;
}

// ── Resposta de GET /api/links ─────────────────────────────────────────────

export interface PaginationMeta {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface LinksPage {
  data: LinkItem[];
  meta: PaginationMeta;
}

// ── Mapeamento de expiração para segundos ──────────────────────────────────

/**
 * Converte as opções de expiração do frontend para `expiresIn` (segundos).
 * Retorna undefined para "Nunca" (campo omitido no POST).
 * Retorna undefined para "Data específica" — pendente de alinhamento com a API.
 */
export function expiryChoiceToSeconds(
  choice: 'never' | '1d' | '7d' | '30d' | 'custom',
): number | undefined {
  switch (choice) {
    case '1d':  return 86_400;        // 1 dia
    case '7d':  return 604_800;       // 7 dias
    case '30d': return 2_592_000;     // 30 dias
    case 'custom': return undefined;  // pendente: formato de data a alinhar com API (A4)
    case 'never':
    default:
      return undefined;               // omitido = nunca expira
  }
}
