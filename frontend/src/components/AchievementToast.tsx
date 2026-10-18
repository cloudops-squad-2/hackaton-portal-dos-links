/**
 * AchievementToast — notificação temporária de conquista desbloqueada.
 *
 * Aparece no canto inferior direito, some após 3,5 s.
 * Controlado pelo App.tsx via prop `achievement` (null = oculto).
 */

import type { Achievement } from '../utils/achievements';

interface AchievementToastProps {
  achievement: Achievement | null;
}

export function AchievementToast({ achievement }: AchievementToastProps) {
  if (!achievement) return null;

  return (
    <div
      className="achievement-toast"
      role="status"
      aria-live="polite"
      aria-label={`Conquista desbloqueada: ${achievement.title}`}
    >
      <span className="achievement-toast__marker" aria-hidden="true">
        {achievement.marker}
      </span>
      <div className="achievement-toast__text">
        <p className="achievement-toast__label">Conquista desbloqueada</p>
        <p className="achievement-toast__title">{achievement.title}</p>
      </div>
    </div>
  );
}
