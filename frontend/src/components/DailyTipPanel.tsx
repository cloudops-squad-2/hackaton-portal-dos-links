import { useState } from 'react';
import { categoryLabel, getDailyTip } from '../utils/dailyTip';

/** Dica editorial: conteúdo local, sem dados fictícios da API. */
export function DailyTipPanel() {
  const [tip] = useState(getDailyTip);

  return (
    <section className="lab-daily-panel" aria-labelledby="lab-daily-title">
      <p className="lab-daily-label">NOTA DO LABORATÓRIO</p>
      <h2 id="lab-daily-title">Dica do laboratório</h2>
      <p className="lab-daily-category">{categoryLabel(tip.category)}</p>
      <p className="lab-daily-text">{tip.text}</p>
      <p className="lab-daily-scope">Dica educativa — não representa um link publicado.</p>
    </section>
  );
}
