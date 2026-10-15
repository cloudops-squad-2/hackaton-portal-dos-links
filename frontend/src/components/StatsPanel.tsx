/**
 * StatsPanel — indicadores e ranking dos experimentos.
 *
 * C5: indicadores derivados exclusivamente de dados reais da API.
 *
 * Transparência sobre limitações:
 *   - meta.total: contagem global real (vinda da API, confiável).
 *   - Soma de cliques e ranking: calculados sobre os links da PÁGINA atual.
 *     Quando há múltiplas páginas, essa informação é indicada na UI.
 *   - Nenhum número é inventado ou estimado.
 */

import { useState } from 'react';
import type { LinkItem, PaginationMeta } from '../types/link';

// ── Props ──────────────────────────────────────────────────────────────────

interface StatsPanelProps {
  links: LinkItem[];
  meta:  PaginationMeta | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const PUBLIC_BASE: string =
  (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined) ?? '';

function buildShortUrl(code: string): string {
  const base = PUBLIC_BASE.replace(/\/$/, '');
  return base ? `${base}/${code}` : `/${code}`;
}

// ── Componente ─────────────────────────────────────────────────────────────

export function StatsPanel({ links, meta }: StatsPanelProps) {
  const [renderTime] = useState(() => Date.now());

  if (!meta && links.length === 0) return null;

  // Dados derivados apenas dos links carregados na página atual
  const totalClicks   = links.reduce((sum, l) => sum + l.clickCount, 0);
  const activeLinks   = links.filter((l) => !l.expiresAt || new Date(l.expiresAt).getTime() > renderTime).length;
  const isMultiPage   = meta ? meta.totalPages > 1 : false;

  // Ranking: top 5 por cliques, somente da página atual
  const ranking = [...links]
    .sort((a, b) => b.clickCount - a.clickCount)
    .slice(0, 5);

  const multiPageNote = isMultiPage
    ? `(página ${meta!.page} de ${meta!.totalPages})`
    : null;

  return (
    <section className="stats-panel" aria-labelledby="stats-title">
      <h2 id="stats-title" className="stats-title">
        Indicadores
      </h2>

      {/* ── Indicadores ── */}
      <div className="stats-grid">

        <div className="stat-card">
          
          <span className="stat-value">
            {meta ? meta.total.toLocaleString('pt-BR') : links.length}
          </span>
          <span className="stat-label">
            {meta ? 'Experimentos no total' : 'Links carregados'}
          </span>
        </div>

        <div className="stat-card">
          
          <span className="stat-value">{totalClicks.toLocaleString('pt-BR')}</span>
          <span className="stat-label">
            Cliques{multiPageNote && (
              <span className="stat-scope"> {multiPageNote}</span>
            )}
          </span>
        </div>

        <div className="stat-card">
          
          <span className="stat-value">{activeLinks}</span>
          <span className="stat-label">
            Ativos{multiPageNote && (
              <span className="stat-scope"> {multiPageNote}</span>
            )}
          </span>
        </div>

      </div>

      {/* ── Ranking ── */}
      {ranking.length > 0 && (
        <div className="ranking-section">
          <h3 className="ranking-title">
            Mais acessados nesta página
            {multiPageNote && (
              <span className="ranking-scope"> {multiPageNote}</span>
            )}
          </h3>

          {isMultiPage && (
            <p className="ranking-note">
              Ranking calculado sobre os {links.length} links desta página.
              Carregue outras páginas para ver mais.
            </p>
          )}

          <ol className="ranking-list">
            {ranking.map((link, i) => {
              const shortUrl = buildShortUrl(link.code);
              const ranks = ['01', '02', '03', '04', '05'];
              return (
                <li key={link.id} className="ranking-item">
                  <span className="ranking-medal" aria-hidden="true">
                    {ranks[i] ?? `${i + 1}.`}
                  </span>
                  <div className="ranking-info">
                    <a
                      href={shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ranking-code"
                      aria-label={`Abrir link ${link.code}`}
                    >
                      <code>{link.code}</code>
                    </a>
                    <span
                      className="ranking-url"
                      title={link.originalUrl}
                    >
                      {link.originalUrl}
                    </span>
                  </div>
                  <span className="ranking-clicks" aria-label={`${link.clickCount} cliques`}>
                    {link.clickCount.toLocaleString('pt-BR')}
                    <span className="ranking-clicks-label"> cliques</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

    </section>
  );
}
