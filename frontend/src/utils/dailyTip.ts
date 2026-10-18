/**
 * dailyTip.ts — dica diária do Laboratório da Dra. Miúda.
 *
 * A dica é escolhida determinísticamente pela data do calendário local:
 *   índice = (dayOfYear - 1) % tips.length
 *
 * O cálculo usa ano/mês/dia explícitos para evitar problemas com
 * horário de verão (DST): subtrair timestamps pode resultar em ±1 dia
 * dependendo do fuso e da transição DST.
 *
 * Sem chamadas externas, sem estado persistido.
 */

export interface DailyTip {
  text:     string;
  category: 'segurança' | 'privacidade' | 'boas-práticas' | 'curiosidade';
}

const TIPS: DailyTip[] = [
  {
    text:     'Prefira páginas HTTPS: a conexão é criptografada, mas isso não garante que o destino seja confiável.',
    category: 'segurança',
  },
  {
    text:     'Links encurtados escondem o destino. Antes de clicar, verifique a origem em ferramentas como o VirusTotal.',
    category: 'segurança',
  },
  {
    text:     'A validade limita por quanto tempo o redirecionamento funciona. Não substitui controle de acesso.',
    category: 'privacidade',
  },
  {
    text:     'Nomes descritivos ajudam a organizar seus links. Identifique sempre o propósito de cada experimento.',
    category: 'boas-práticas',
  },
  {
    text:     'O primeiro serviço de encurtamento de URLs amplamente usado, TinyURL, foi lançado em 2002.',
    category: 'curiosidade',
  },
  {
    text:     'Evite compartilhar links com credenciais na query string (?token=…). Qualquer pessoa com o link tem acesso.',
    category: 'segurança',
  },
  {
    text:     'Um bom encurtador registra cliques mas não deve revelar dados pessoais de quem clicou.',
    category: 'privacidade',
  },
  {
    text:     'HTTP/2 e HTTP/3 melhoram o desempenho geral da web com multiplexação e menos conexões, beneficiando qualquer serviço — inclusive encurtadores.',
    category: 'curiosidade',
  },
  {
    text:     'QR codes codificam dados (geralmente uma URL) em um padrão visual de matriz. Scanners decodificam e abrem o endereço — não são links encurtados, mas costumam ser usados juntos.',
    category: 'curiosidade',
  },
  {
    text:     'Confira se o link ainda está válido antes de divulgar em canais públicos.',
    category: 'boas-práticas',
  },
  {
    text:     'Links com utm_source, utm_medium e utm_campaign permitem rastrear de onde vieram os visitantes.',
    category: 'boas-práticas',
  },
  {
    text:     'Nunca clique em links de remetentes desconhecidos que pedem login ou dados bancários.',
    category: 'segurança',
  },
  {
    text:     'O TLD .com é o mais registrado do mundo, com mais de 150 milhões de domínios ativos.',
    category: 'curiosidade',
  },
  {
    text:     'Encurtar uma URL não remove parâmetros de rastreamento que já estavam nela. Verifique antes de compartilhar.',
    category: 'privacidade',
  },
];

const CATEGORY_LABELS: Record<DailyTip['category'], string> = {
  'segurança':     'Segurança',
  'privacidade':   'Privacidade',
  'boas-práticas': 'Boas práticas',
  'curiosidade':   'Curiosidade',
};

/** Retorna o label de exibição da categoria. */
export function categoryLabel(cat: DailyTip['category']): string {
  return CATEGORY_LABELS[cat];
}


/** Sorteia uma nova dica em cada abertura da página, sem repetir a anterior. */
export function getDailyTip(): DailyTip {
  let previous = -1;
  try {
    const value = Number(localStorage.getItem('encolhe-last-tip-v3'));
    if (localStorage.getItem('encolhe-last-tip-v3') !== null && Number.isInteger(value)) previous = value;
  } catch { /* armazenamento indisponível */ }
  let next = Math.floor(Math.random() * TIPS.length);
  if (TIPS.length > 1 && next === previous) {
    next = (next + 1 + Math.floor(Math.random() * (TIPS.length - 1))) % TIPS.length;
  }
  try { localStorage.setItem('encolhe-last-tip-v3', String(next)); } catch { /* opcional */ }
  return TIPS[next];
}
