/**
 * validation.ts — funções puras de validação para o formulário do Raio Encolhedor.
 *
 * Nenhuma dessas funções faz chamadas à API. Toda validação de disponibilidade
 * de código ou conflito de nomes deve vir do backend (tarefas B5/B6).
 */

/** Caracteres aceitos no final personalizado: letras ASCII e dígitos. */
const CUSTOM_CODE_PATTERN = /^[a-zA-Z0-9]+$/;

/**
 * Valida a URL de destino.
 * Aceita somente http:// e https://.
 * Retorna uma mensagem de erro ou null se válida.
 */
export function validateUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Digite um endereço de destino para o experimento.';
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Digite um endereço começando com https:// ou http://.';
    }
    return null;
  } catch {
    return 'Digite um endereço começando com https:// ou http://.';
  }
}

/**
 * Valida o final personalizado do link.
 * - Se vazio, é válido (campo opcional — o backend gera o código).
 * - Se preenchido, deve ter exatamente `requiredLength` caracteres
 *   e conter apenas letras ASCII e dígitos.
 * Retorna uma mensagem de erro ou null se válido.
 */
export function validateCustomCode(value: string, requiredLength: number): string | null {
  if (!value) return null; // campo opcional

  if (!CUSTOM_CODE_PATTERN.test(value)) {
    return 'Use apenas letras (sem acento) e números, sem espaços.';
  }
  if (value.length !== requiredLength) {
    return `O modo selecionado precisa de exatamente ${requiredLength} caracteres.`;
  }
  return null;
}

/**
 * Valida o limite de acessos.
 * - Se vazio, é válido (ilimitado).
 * - Aceita SOMENTE dígitos de 0–9 (rejeita notação científica, ponto, vírgula).
 * - Deve ser um inteiro positivo dentro do intervalo seguro do JavaScript.
 * Retorna uma mensagem de erro ou null se válido.
 */
export function validateMaxClicks(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null; // campo opcional

  // Rejeita qualquer coisa que não seja somente dígitos
  if (!/^\d+$/.test(trimmed)) {
    return 'Digite um número inteiro positivo ou deixe vazio para ilimitado.';
  }

  const num = parseInt(trimmed, 10);

  if (num < 1) {
    return 'O limite mínimo é 1 acesso.';
  }
  if (num > Number.MAX_SAFE_INTEGER) {
    return 'Número muito grande. Digite um valor menor.';
  }
  return null;
}

/**
 * Valida uma data de expiração personalizada.
 *
 * Regra (conforme Spec): a data deve ser a partir de AMANHÃ no calendário
 * local. O link expira ao FINAL do dia escolhido (23:59:59.999 no fuso do
 * usuário).
 *
 * Datas inexistentes como 31/02 são rejeitadas explicitamente: depois de
 * construir o objeto Date, verificamos se dia, mês e ano batem exatamente
 * com o que foi digitado — o JS normalizaria silenciosamente sem essa checagem.
 *
 * ATENÇÃO — alinhamento pendente com a API (tarefa A4):
 *   O frontend enviará a data como "YYYY-MM-DD" (apenas a data local, sem hora).
 *   A conversão para UTC e a interpretação exata do vencimento devem ser
 *   definidas em conjunto com o backend antes de B6.
 *
 * Retorna uma mensagem de erro ou null se válida.
 */
export function validateCustomExpiry(value: string): string | null {
  if (!value) return null; // campo opcional

  // input[type=date] entrega "YYYY-MM-DD" — interpretar como data LOCAL
  const parts = value.split('-').map(Number);
  if (parts.length !== 3) {
    return 'Data inválida. Use o seletor de data.';
  }
  const [year, month, day] = parts;

  // Constrói a data local e verifica se dia/mês/ano batem exatamente —
  // rejeita datas inexistentes (ex.: 31/02) que o JS normalizaria silenciosamente.
  const built = new Date(year, month - 1, day);
  if (
    isNaN(built.getTime()) ||
    built.getFullYear() !== year  ||
    built.getMonth()    !== month - 1 ||
    built.getDate()     !== day
  ) {
    return 'Data inválida. Use o seletor de data.';
  }

  // Data mínima aceita: amanhã no calendário local (início do dia, 00:00:00)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  if (built < tomorrow) {
    return 'Escolha uma data a partir de amanhã para a expiração.';
  }
  return null;
}

/**
 * Retorna a data mínima aceita no input[type=date]: amanhã no formato
 * YYYY-MM-DD no calendário local.
 */
export function tomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
