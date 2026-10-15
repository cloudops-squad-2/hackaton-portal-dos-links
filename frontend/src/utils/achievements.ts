/**
 * achievements.ts — conquistas locais do Laboratório da Dra. Miúda.
 *
 * Conquistas são registradas em localStorage e acionadas por ações
 * observáveis no frontend. Elas NÃO refletem dados de conta nem histórico
 * global: são específicas deste navegador/dispositivo e não sincronizam
 * entre dispositivos ou usuários.
 *
 * Cada conquista tem:
 *   id        — chave usada no localStorage
 *   title     — nome exibido
 *   desc      — critério claro e verificável
 *   marker    — identificador visual simples
 *   unlockedAt — data de desbloqueio (ISO string), ou null
 */

export interface Achievement {
  id:          string;
  title:       string;
  desc:        string;
  marker:      string;
  unlockedAt:  string | null; // ISO 8601, null = ainda não desbloqueada
}

// ── Definição das conquistas disponíveis ───────────────────────────────────

const ACHIEVEMENT_DEFS: Omit<Achievement, 'unlockedAt'>[] = [
  {
    id:    'first_link',
    title: 'Primeiro Experimento',
    desc:  'Criou o primeiro link encurtado neste navegador.',
    marker: '01',
  },
  {
    id:    'first_copy',
    title: 'Cópia Perfeita',
    desc:  'Copiou um link encurtado para a área de transferência.',
    marker: '02',
  },
  {
    id:    'three_links',
    title: 'Série Experimental',
    desc:  'Criou 3 links encurtados neste navegador.',
    marker: '03',
  },
  {
    id:    'expiry_set',
    title: 'Experimento Temporário',
    desc:  'Criou um link com data de expiração.',
    marker: '04',
  },
];

const STORAGE_KEY = 'encolhe_achievements';
const COUNTER_KEY = 'encolhe_link_count';

// ── Leitura do localStorage ────────────────────────────────────────────────

function readUnlocked(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeUnlocked(data: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage pode estar indisponível (modo privado com storage bloqueado)
  }
}

// ── API pública ────────────────────────────────────────────────────────────

/** Retorna todas as conquistas com status de desbloqueio atual. */
export function getAllAchievements(): Achievement[] {
  const unlocked = readUnlocked();
  return ACHIEVEMENT_DEFS.map((def) => ({
    ...def,
    unlockedAt: unlocked[def.id] ?? null,
  }));
}

/** Retorna a contagem de links criados neste navegador. */
export function getLinkCount(): number {
  try {
    return parseInt(localStorage.getItem(COUNTER_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Registra a criação de um link. Desbloqueia conquistas relacionadas.
 * Retorna o array de conquistas recém-desbloqueadas (para feedback na UI).
 */
export function recordLinkCreated(hadExpiry: boolean): Achievement[] {
  const unlocked = readUnlocked();
  const now      = new Date().toISOString();
  const newlyUnlocked: Achievement[] = [];

  // Incrementa contador
  const count = getLinkCount() + 1;
  try { localStorage.setItem(COUNTER_KEY, String(count)); } catch { /* */ }

  // first_link
  if (!unlocked['first_link']) {
    unlocked['first_link'] = now;
    newlyUnlocked.push({ ...ACHIEVEMENT_DEFS[0], unlockedAt: now });
  }

  // three_links
  if (!unlocked['three_links'] && count >= 3) {
    unlocked['three_links'] = now;
    newlyUnlocked.push({ ...ACHIEVEMENT_DEFS[2], unlockedAt: now });
  }

  // expiry_set
  if (!unlocked['expiry_set'] && hadExpiry) {
    unlocked['expiry_set'] = now;
    newlyUnlocked.push({ ...ACHIEVEMENT_DEFS[3], unlockedAt: now });
  }

  writeUnlocked(unlocked);
  return newlyUnlocked;
}

/**
 * Registra a cópia de um link. Desbloqueia conquista relacionada.
 * Retorna conquistas recém-desbloqueadas.
 */
export function recordLinkCopied(): Achievement[] {
  const unlocked = readUnlocked();
  const now = new Date().toISOString();
  const newlyUnlocked: Achievement[] = [];

  if (!unlocked['first_copy']) {
    unlocked['first_copy'] = now;
    newlyUnlocked.push({ ...ACHIEVEMENT_DEFS[1], unlockedAt: now });
    writeUnlocked(unlocked);
  }
  return newlyUnlocked;
}
