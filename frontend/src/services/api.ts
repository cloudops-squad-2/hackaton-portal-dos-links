/**
 * api.ts — cliente HTTP centralizado para a API do Encolhe!
 *
 * URL base: variável de ambiente VITE_API_BASE_URL (opcional).
 * Em desenvolvimento, o Vite proxia /api → localhost:3000, então a base
 * padrão é "" (relativa). Em produção, definir VITE_API_BASE_URL.
 *
 * Não guardar segredos aqui: tudo prefixado com VITE_ vai para o bundle.
 */

import type { CreateLinkBody, LinkItem, LinksPage } from '../types/link';

// ── Configuração ───────────────────────────────────────────────────────────

const API_BASE: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

// Tempo máximo de espera por resposta (ms)
const TIMEOUT_MS = 10_000;

// ── Erros tipados ──────────────────────────────────────────────────────────

/** Erro retornado quando a API responde com status ≥ 400. */
export class ApiError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Erro retornado quando não é possível alcançar o servidor. */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('Não foi possível conectar ao laboratório. Tente novamente.');
    this.name = 'NetworkError';
    if (cause instanceof Error) this.cause = cause;
  }
}

// ── Utilitário interno ─────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch (err) {
    clearTimeout(timer);
    throw new NetworkError(err);
  }
  clearTimeout(timer);

  if (!response.ok) {
    let message = `Erro ${response.status}`;
    try {
      const body = await response.json() as { message?: string };
      if (typeof body.message === 'string') message = body.message;
    } catch {
      // ignora falha ao ler corpo do erro
    }
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

// ── Endpoints públicos ─────────────────────────────────────────────────────

/**
 * Cria um novo link encurtado.
 * Envia apenas `url` e, opcionalmente, `expiresIn`.
 * Não envia campos adicionais — a API os rejeita.
 */
export async function createLink(body: CreateLinkBody): Promise<LinkItem> {
  return request<LinkItem>('/api/links', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Busca uma página da listagem de links.
 * @param page  Número da página (começa em 1).
 */
export async function fetchLinks(page = 1): Promise<LinksPage> {
  // Compatível com o DTO atual da API: `limit` ainda não é convertido
  // em número no backend. Usamos o limite padrão retornado por ele.
  return request<LinksPage>(`/api/links?page=${page}`);
}

// ── Utilitário para mensagens de erro amigáveis ───────────────────────────

/**
 * Traduz um erro da API para uma mensagem legível pelo usuário.
 * Usar em blocos catch dos componentes.
 */
export function friendlyError(err: unknown): string {
  if (err instanceof NetworkError) return err.message;
  if (err instanceof ApiError) {
    switch (err.status) {
      case 400: return 'Os dados enviados são inválidos. Verifique os campos e tente novamente.';
      case 409: return 'Esse final personalizado já está em uso. Escolha outro ou deixe em branco.';
      case 429: return 'Muitas tentativas seguidas. Aguarde um momento e tente de novo.';
      case 500:
      case 502:
      case 503: return 'O laboratório está temporariamente indisponível. Tente em instantes.';
      default:  return err.message || `Erro inesperado (${err.status}).`;
    }
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
