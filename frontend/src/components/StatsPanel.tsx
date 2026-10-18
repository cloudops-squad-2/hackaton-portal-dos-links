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
  ownershipRevision?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────


// ── Componente ─────────────────────────────────────────────────────────────

export function StatsPanel({ links, meta, ownershipRevision: _ownershipRevision }: StatsPanelProps) {
  const [renderTime] = useState(() => Date.now());

  if (!meta && links.length === 0) return null;

  // A identificação pessoal é local e pode ser recuperada com confirmação pelo usuário.
  // A revisão de propriedade força nova leitura após o botão "É meu link".
  let codes: string[] = [];
  let hidden: string[] = [];
  let removed: string[] = [];
  let clearedAt = '';
  try {
    const read = (key: string): string[] => {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
    };
    codes = read('encolhe-local-links-v2');
    hidden = read('encolhe-hidden-experiments-v2');
    removed = read('encolhe-removed-from-history-v2');
    clearedAt = localStorage.getItem('encolhe-history-cleared-at-v2') ?? '';
  } catch { /* dados locais indisponíveis */ }
  const mine = links.filter(l => codes.includes(l.code) && !hidden.includes(l.code) && !removed.includes(l.code) && (!clearedAt || Date.parse(l.createdAt) > Date.parse(clearedAt)));
  // Valores reais da API para os links pessoais disponíveis na consulta atual.
  const totalClicks   = mine.reduce((sum, l) => sum + l.clickCount, 0);
  const activeLinks   = mine.filter((l) => !l.expiresAt || new Date(l.expiresAt).getTime() > renderTime).length;


  // Ranking: top 5 pessoais presentes na consulta atual
  const ranking = [...mine]
    .sort((a, b) => b.clickCount - a.clickCount)
    .slice(0, 5);



  return (
    <section className="stats-panel" aria-labelledby="stats-title">
      <h2 id="stats-title" className="stats-title">
        Indicadores
      </h2>

      {/* ── Indicadores ── */}
      <div className="stats-grid">

        <div className="stat-card">
          
          <span className="stat-value">
            {mine.length.toLocaleString('pt-BR')}
          </span>
          <span className="stat-label">
            Meus links identificados nesta consulta
          </span>
        </div>

        <div className="stat-card">
          
          <span className="stat-value">{totalClicks.toLocaleString('pt-BR')}</span>
          <span className="stat-label">
            Cliques dos meus links nesta consulta
          </span>
        </div>

        <div className="stat-card">
          
          <span className="stat-value">{activeLinks}</span>
          <span className="stat-label">
            Meus links ativos nesta consulta
          </span>
        </div>

      </div>

      <p className="v2-history-note">Os Indicadores mostram apenas links reconhecidos como seus nesta página. Conquistas antigas não informam códigos ou cliques; valores de cliques são obtidos da API.</p>
      {/* ── Ranking ── */}
      {ranking.length > 0 && (
        <div className="ranking-section">
          <h3 className="ranking-title">
            Meus links mais acessados
          </h3>

          <ol className="ranking-list">
            {ranking.map((link, i) => {
              const ranks = ['01', '02', '03', '04', '05'];
              return (
                <li key={link.id} className="ranking-item">
                  <span className="ranking-medal" aria-hidden="true">
                    {ranks[i] ?? `${i + 1}.`}
                  </span>
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
