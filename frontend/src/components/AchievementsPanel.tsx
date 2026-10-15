/**
 * AchievementsPanel — conquistas locais do laboratório.
 *
 * Conquistas baseadas em ações observáveis neste navegador.
 *
 * Transparência:
 *   - Conquistas vivem no localStorage deste navegador/dispositivo.
 *   - Não representam histórico de conta — isso exigiria autenticação.
 *   - Uma nota explícita informa esse limite na interface.
 */

import type { Achievement } from '../utils/achievements';

// ── Props ──────────────────────────────────────────────────────────────────

interface AchievementsPanelProps {
  achievements: Achievement[];
}

// ── Componente ─────────────────────────────────────────────────────────────

export function AchievementsPanel({ achievements }: AchievementsPanelProps) {
  const unlocked     = achievements.filter((a) => a.unlockedAt !== null);
  const locked       = achievements.filter((a) => a.unlockedAt === null);
  const totalCount   = achievements.length;
  const unlockedCount = unlocked.length;

  return (
    <section className="achievements-panel" aria-labelledby="achievements-title">
      <h2 id="achievements-title" className="achievements-title">
        Conquistas do laboratório
      </h2>

      {/* Nota de escopo — transparência obrigatória */}
      <p className="achievements-scope-note">
        Registradas neste navegador. Não sincronizam entre dispositivos.
      </p>

      {/* Progresso */}
      <div className="achievements-progress" aria-label={`${unlockedCount} de ${totalCount} conquistas desbloqueadas`}>
        <div className="achievements-progress-bar">
          <div
            className="achievements-progress-fill"
            style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
            role="progressbar"
            aria-valuenow={unlockedCount}
            aria-valuemin={0}
            aria-valuemax={totalCount}
          />
        </div>
        <span className="achievements-progress-label">
          {unlockedCount} / {totalCount}
        </span>
      </div>

      {/* Grade de conquistas */}
      <div className="achievements-grid">
        {/* Desbloqueadas primeiro */}
        {unlocked.map((a) => (
          <div key={a.id} className="achievement-card achievement-card--unlocked">
            <span className="achievement-marker" aria-hidden="true">{a.marker}</span>
            <span className="achievement-name">{a.title}</span>
            <span className="achievement-desc">{a.desc}</span>
            {a.unlockedAt && (
              <span className="achievement-date">
                {new Date(a.unlockedAt).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        ))}
        {/* Bloqueadas depois */}
        {locked.map((a) => (
          <div key={a.id} className="achievement-card achievement-card--locked" aria-label={`Conquista bloqueada: ${a.title}`}>
            <span className="achievement-marker achievement-marker--locked" aria-hidden="true">{a.marker}</span>
            <span className="achievement-name">{a.title}</span>
            <span className="achievement-desc">{a.desc}</span>
          </div>
        ))}
      </div>

    </section>
  );
}
