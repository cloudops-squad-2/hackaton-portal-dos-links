/**
 * ExperimentList — lista paginada dos experimentos com busca e ordenação.
 *
 * B8: listagem real via GET /api/links, estados de carregamento, erro,
 *     lista vazia e paginação.
 * B9: atualização após criação de link (refreshKey).
 * C4: busca e ordenação client-side sobre os itens da página carregada.
 *     Aviso explícito de escopo: filtros se aplicam somente à página atual.
 *
 * Expõe os dados carregados ao pai via onDataChange para StatsPanel (C5).
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchLinks, friendlyError } from '../services/api';
import type { LinkItem, PaginationMeta } from '../types/link';
import { LinkQrCode } from './LinkQrCode';

// ── Constantes ─────────────────────────────────────────────────────────────

const PUBLIC_BASE: string =
  (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined) ?? '';

// ── Tipos ──────────────────────────────────────────────────────────────────

type SortField = 'createdAt' | 'clickCount';
type SortDir   = 'desc' | 'asc';

// ── Helpers ────────────────────────────────────────────────────────────────

function buildShortUrl(code: string): string {
  const base = PUBLIC_BASE.replace(/\/$/, '');
  return base ? `${base}/${code}` : `/${code}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ── Props ──────────────────────────────────────────────────────────────────

interface ExperimentListProps {
  refreshKey: number;
  /** Chamado sempre que novos dados são carregados — alimenta StatsPanel. */
  onDataChange?: (links: LinkItem[], meta: PaginationMeta | null) => void;
}

// ── Componente ─────────────────────────────────────────────────────────────

export function ExperimentList({ refreshKey, onDataChange }: ExperimentListProps) {
  const [links,   setLinks]   = useState<LinkItem[]>([]);
  const [meta,    setMeta]    = useState<PaginationMeta | null>(null);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [qrLink, setQrLink] = useState<{ code: string; url: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState('');

  // C4 — busca e ordenação
  const [query,     setQuery]     = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');

  // ── Fetch ────────────────────────────────────────────────────────────────

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLinks(targetPage);
      setLinks(result.data);
      setMeta(result.meta);
      setPage(targetPage);
      onDataChange?.(result.data, result.meta);
    } catch (err) {
      setLinks([]);
      setMeta(null);
      setError(friendlyError(err));
      onDataChange?.([], null);
    } finally {
      setLoading(false);
    }
  }, [onDataChange]);

  useEffect(() => {
    // Agenda a busca após a montagem, sem atualizar o estado durante o efeito.
    // O cancelamento também evita a primeira solicitação duplicada no StrictMode.
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void load(1);
    });
    return () => { cancelled = true; };
  }, [load, refreshKey]);

  // ── Derivações C4 ────────────────────────────────────────────────────────

  // Filtro: busca no código E na URL original (case-insensitive)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return links;
    return links.filter(
      (l) =>
        l.code.toLowerCase().includes(q) ||
        l.originalUrl.toLowerCase().includes(q),
    );
  }, [links, query]);

  // Ordenação sobre os itens filtrados
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let diff: number;
      if (sortField === 'clickCount') {
        diff = a.clickCount - b.clickCount;
      } else {
        diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [filtered, sortField, sortDir]);

  const isFiltered    = query.trim().length > 0;
  const isMultiPage   = meta ? meta.totalPages > 1 : false;
  const showScopeNote = isFiltered || (sortField !== 'createdAt' || sortDir !== 'desc');

  function toggleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function sortLabel(field: SortField): string {
    if (field !== sortField) return '';
    return sortDir === 'desc' ? ' ↓' : ' ↑';
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('Link copiado.');
    } catch {
      setCopyStatus('Não foi possível copiar. Selecione o link para copiar manualmente.');
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="list-section" aria-labelledby="list-title">

      {/* Cabeçalho com título e botão de atualizar */}
      <div className="list-header">
        <h2 id="list-title" className="list-title">
          Meus experimentos
        </h2>
        <button
          type="button"
          className="btn-refresh"
          onClick={() => load(page)}
          disabled={loading}
          aria-label="Atualizar lista de experimentos"
        >
          {loading ? 'Carregando…' : 'Atualizar'}
        </button>
      </div>

      {/* C4 — controles de busca e ordenação */}
      <div className="list-controls">
        <div className="list-search-wrap">
          <label htmlFor="list-search" className="sr-only">
            Buscar por código ou URL
          </label>
          <input
            id="list-search"
            type="search"
            className="list-search"
            placeholder="Buscar por código ou URL…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar por código ou URL"
          />
          {query && (
            <button
              type="button"
              className="list-search-clear"
              onClick={() => setQuery('')}
              aria-label="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>

        <div className="list-sort-wrap">
          <span className="list-sort-label">Ordenar:</span>
          <button
            type="button"
            className={`btn-sort${sortField === 'createdAt' ? ' btn-sort--active' : ''}`}
            onClick={() => toggleSort('createdAt')}
            aria-pressed={sortField === 'createdAt'}
          >
            Data{sortLabel('createdAt')}
          </button>
          <button
            type="button"
            className={`btn-sort${sortField === 'clickCount' ? ' btn-sort--active' : ''}`}
            onClick={() => toggleSort('clickCount')}
            aria-pressed={sortField === 'clickCount'}
          >
            Cliques{sortLabel('clickCount')}
          </button>
        </div>
      </div>

      {/* Nota de escopo dos filtros — aparece quando há busca/ordenação e múltiplas páginas */}
      {showScopeNote && isMultiPage && (
        <p className="list-scope-note" role="note">
           Busca e ordenação aplicadas aos {links.length} links desta página.
          A API não possui busca global confirmada — carregue outras páginas para ver mais resultados.
        </p>
      )}

      {/* Estado de carregamento */}
      {loading && (
        <div className="list-status" role="status" aria-live="polite">
          <span className="list-status-spinner" aria-hidden="true"></span>
          Carregando links…
        </div>
      )}

      {/* Erro de conexão */}
      {!loading && error && (
        <div className="list-error" role="alert">
          <p><strong> Não foi possível carregar os links</strong></p>
          <p>{error}</p>
          <button type="button" className="btn-retry" onClick={() => load(page)}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Lista vazia (sem dados da API) */}
      {!loading && !error && links.length === 0 && (
        <div className="list-empty">
          
          <p className="list-empty-text">Ainda não há links cadastrados.</p>
          <p className="list-empty-hint">
            Use o formulário acima para criar seu primeiro link.
          </p>
        </div>
      )}

      {/* Nenhum resultado após filtro */}
      {!loading && !error && links.length > 0 && sorted.length === 0 && (
        <div className="list-empty">
          
          <p className="list-empty-text">Nenhum link encontrado para "{query}".</p>
          <p className="list-empty-hint">Tente outra parte do código ou URL.</p>
        </div>
      )}

      {/* Tabela */}
      {!loading && !error && sorted.length > 0 && (
        <>
          {isFiltered && (
            <p className="list-filter-count" aria-live="polite">
              {sorted.length} {sorted.length === 1 ? 'resultado' : 'resultados'} encontrados
            </p>
          )}

          <div
            className="list-table-wrap"
            role="region"
            aria-label="Lista de experimentos"
            tabIndex={0}
          >
            <table className="list-table">
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">URL original</th>
                  <th scope="col">
                    <button
                      type="button"
                      className="th-sort-btn"
                      onClick={() => toggleSort('createdAt')}
                      aria-label={`Ordenar por data de criação ${sortField === 'createdAt' ? (sortDir === 'desc' ? '(mais recente primeiro)' : '(mais antigo primeiro)') : ''}`}
                    >
                      Criado em{sortLabel('createdAt')}
                    </button>
                  </th>
                  <th scope="col" className="list-clicks">
                    <button
                      type="button"
                      className="th-sort-btn"
                      onClick={() => toggleSort('clickCount')}
                      aria-label={`Ordenar por cliques ${sortField === 'clickCount' ? (sortDir === 'desc' ? '(mais clicado primeiro)' : '(menos clicado primeiro)') : ''}`}
                    >
                      Cliques{sortLabel('clickCount')}
                    </button>
                  </th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((link) => {
                  const shortUrl = buildShortUrl(link.code);
                  return (
                    <tr key={link.id}>
                      <td>
                        <a
                          href={shortUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="list-code-link"
                          aria-label={`Abrir link encurtado ${link.code}`}
                        >
                          <code>{link.code}</code>
                        </a>
                      </td>
                      <td>
                        <span className="list-original-url" title={link.originalUrl}>
                          {link.originalUrl}
                        </span>
                      </td>
                      <td className="list-date">
                        <time dateTime={link.createdAt}>{formatDate(link.createdAt)}</time>
                      </td>
                      <td className="list-clicks">
                        <span aria-label={`${link.clickCount} cliques`}>
                          {link.clickCount}
                        </span>
                      </td>
                      <td>
                        <div className="link-actions">
                          <button type="button" onClick={() => void copyLink(new URL(shortUrl, window.location.origin).toString())} aria-label={`Copiar link ${link.code}`}>Copiar</button>
                          <button type="button" onClick={() => { setQrLink({ code: link.code, url: new URL(shortUrl, window.location.origin).toString() }); setCopyStatus(''); }} aria-label={`Exibir QR Code de ${link.code}`}>QR Code</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {copyStatus && <p role="status" className="link-copy-status">{copyStatus}</p>}
          {qrLink && (
            <section className="link-qr-panel" aria-label={`QR Code de ${qrLink.code}`}>
              <div>
                <strong>QR Code — {qrLink.code}</strong>
                <p>Escaneie para abrir o link curto.</p>
                <a href={qrLink.url} target="_blank" rel="noopener noreferrer">{qrLink.url}</a>
              </div>
              <LinkQrCode url={qrLink.url} />
              <button type="button" onClick={() => setQrLink(null)} aria-label="Fechar QR Code">Fechar</button>
            </section>
          )}

          {/* Paginação */}
          {meta && meta.totalPages > 1 && (
            <nav className="list-pagination" aria-label="Paginação de experimentos">
              <button
                type="button"
                className="btn-page"
                onClick={() => load(page - 1)}
                disabled={page <= 1 || loading}
                aria-label="Página anterior"
              >
                ← Anterior
              </button>
              <span className="list-page-info">
                Página {page} de {meta.totalPages}
                {' '}
                <span className="list-page-total">
                  ({meta.total} {meta.total === 1 ? 'experimento' : 'experimentos'})
                </span>
              </span>
              <button
                type="button"
                className="btn-page"
                onClick={() => load(page + 1)}
                disabled={page >= meta.totalPages || loading}
                aria-label="Próxima página"
              >
                Próxima →
              </button>
            </nav>
          )}

          {meta && meta.totalPages <= 1 && (
            <p className="list-total-single">
              {meta.total} {meta.total === 1 ? 'experimento' : 'experimentos'} no laboratório
            </p>
          )}
        </>
      )}
    </section>
  );
}
