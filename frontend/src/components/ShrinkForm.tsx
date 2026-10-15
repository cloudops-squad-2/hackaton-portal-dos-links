/**
 * ShrinkForm — formulário do Raio Encolhedor com integração real à API.
 *
 * B1–B4: validações locais (URL, modo, código, expiração, limite).
 * B5:    cliente API tipado, loading, erros de rede.
 * B6:    criação real; campos sem suporte bloqueiam o envio com aviso explícito.
 * B7:    exibição do link encurtado real, copiar e abrir.
 *
 * Regra de transparência (Spec RF02 / seção 3):
 *   Se o usuário configurou algo que a API ainda não suporta, o envio é
 *   BLOQUEADO e o aviso fica visível mesmo com a seção avançada fechada.
 *   O usuário precisa escolher Mini e remover as configurações pendentes
 *   para poder criar o link agora.
 *
 * Funcionalidades pendentes de suporte no backend (contrato out/2026):
 *   - Micro (5 chars) e Nano (3 chars) — backend gera apenas 7 chars (Mini)
 *   - Nome do experimento (displayName)
 *   - Final personalizado (customCode)
 *   - Data específica de expiração
 *   - Limite de acessos (maxClicks)
 */

import { useState } from 'react';
import { createLink, friendlyError } from '../services/api';
import { expiryChoiceToSeconds } from '../types/link';
import type { LinkItem } from '../types/link';
import {
  validateUrl,
  validateCustomCode,
  validateMaxClicks,
  validateCustomExpiry,
  tomorrowDateString,
} from '../utils/validation';

// ── Tipos ──────────────────────────────────────────────────────────────────

type Mode = 'mini' | 'micro' | 'nano';
type ExpiryChoice = 'never' | '1d' | '7d' | '30d' | 'custom';

interface ModeOption {
  id: Mode;
  label: string;
  chars: number;
  desc: string;
  supported: boolean;
}

// ── Constantes ─────────────────────────────────────────────────────────────

const MODES: ModeOption[] = [
  { id: 'mini',  label: 'Mini',  chars: 7, desc: 'Padrão',    supported: true  },
  { id: 'micro', label: 'Micro', chars: 5, desc: 'Compacto',  supported: false },
  { id: 'nano',  label: 'Nano',  chars: 3, desc: 'Minúsculo', supported: false },
];

const MODE_CHARS: Record<Mode, number> = { mini: 7, micro: 5, nano: 3 };

const EXPIRY_OPTIONS: { value: ExpiryChoice; label: string }[] = [
  { value: 'never',  label: 'Nunca (padrão)'          },
  { value: '1d',     label: '1 dia'                   },
  { value: '7d',     label: '7 dias'                  },
  { value: '30d',    label: '30 dias'                 },
  { value: 'custom', label: 'Data específica (em breve)' },
];

// Base pública para montar o link curto exibido ao usuário
const PUBLIC_BASE: string =
  (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined) ?? '';

// ── Helpers ────────────────────────────────────────────────────────────────

function buildShortUrl(code: string): string {
  const base = PUBLIC_BASE.replace(/\/$/, '');
  return base ? `${base}/${code}` : `/${code}`;
}

/**
 * Retorna a lista de itens pendentes que o usuário configurou mas que
 * a API ainda não suporta. Array vazio = tudo compatível com o contrato atual.
 */
function getPendingItems(
  mode: Mode,
  displayName: string,
  customCode: string,
  expiryChoice: ExpiryChoice,
  maxClicks: string,
): string[] {
  const items: string[] = [];
  if (mode !== 'mini')        items.push(`modo ${mode === 'micro' ? 'Micro (5 chars)' : 'Nano (3 chars)'}`);
  if (displayName.trim())     items.push('nome do experimento');
  if (customCode.trim())      items.push('final personalizado');
  if (expiryChoice === 'custom') items.push('data específica de expiração');
  if (maxClicks.trim())       items.push('limite de acessos');
  return items;
}

// ── Props ──────────────────────────────────────────────────────────────────

interface ShrinkFormProps {
  /** Chamado após criação bem-sucedida para que o App recarregue a listagem. */
  onLinkCreated?: (hadExpiry: boolean) => void;
  /** Chamado após cópia bem-sucedida para que o App atualize conquistas. */
  onLinkCopied?: () => void;
  /** Chamado quando o envio começa — permite animar a Dra. Miúda. */
  onSubmitting?: () => void;
  /** Chamado quando o envio falha com erro — permite animar a Dra. Miúda. */
  onSubmitError?: () => void;
}

// ── Componente ─────────────────────────────────────────────────────────────

export function ShrinkForm({ onLinkCreated, onLinkCopied, onSubmitting, onSubmitError }: ShrinkFormProps) {
  // Campos principais
  const [url,      setUrl]      = useState('');
  const [mode,     setMode]     = useState<Mode>('mini');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [touched,  setTouched]  = useState(false);

  // Seção avançada
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Campos avançados (preservados para ativação futura)
  const [displayName,  setDisplayName]  = useState('');
  const [customCode,   setCustomCode]   = useState('');
  const [expiryChoice, setExpiryChoice] = useState<ExpiryChoice>('never');
  const [customExpiry, setCustomExpiry] = useState('');
  const [maxClicks,    setMaxClicks]    = useState('');

  // Erros dos campos avançados
  const [customCodeError,    setCustomCodeError]    = useState<string | null>(null);
  const [customExpiryError,  setCustomExpiryError]  = useState<string | null>(null);
  const [maxClicksError,     setMaxClicksError]     = useState<string | null>(null);

  // Estado da requisição
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Resultado
  const [createdLink, setCreatedLink] = useState<LinkItem | null>(null);
  const [copyStatus,  setCopyStatus]  = useState<'idle' | 'copied' | 'failed'>('idle');

  // ── Derivações ──────────────────────────────────────────────────────────

  const expiryValid =
    expiryChoice !== 'custom' ||
    (customExpiry !== '' && validateCustomExpiry(customExpiry) === null);

  const formValid =
    validateUrl(url) === null &&
    validateCustomCode(customCode, MODE_CHARS[mode]) === null &&
    expiryValid &&
    validateMaxClicks(maxClicks) === null;

  // Itens que bloqueiam o envio por falta de suporte na API
  const pendingItems = getPendingItems(mode, displayName, customCode, expiryChoice, maxClicks);
  const hasPending   = pendingItems.length > 0;

  // O botão só fica ativo quando o formulário está válido E não há pendências
  const canSubmit = formValid && !hasPending && !submitting;

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleUrlChange(value: string) {
    setUrl(value);
    if (touched) setUrlError(validateUrl(value));
  }

  function handleUrlBlur() {
    setTouched(true);
    setUrlError(validateUrl(url));
  }

  function handleModeChange(newMode: Mode) {
    setMode(newMode);
    if (customCode) {
      setCustomCodeError(validateCustomCode(customCode, MODE_CHARS[newMode]));
    }
  }

  function handleCustomCodeChange(value: string) {
    setCustomCode(value);
    setCustomCodeError(validateCustomCode(value, MODE_CHARS[mode]));
  }

  function handleExpiryChoiceChange(value: ExpiryChoice) {
    setExpiryChoice(value);
    if (value !== 'custom') {
      setCustomExpiry('');
      setCustomExpiryError(null);
    }
  }

  function handleCustomExpiryChange(value: string) {
    setCustomExpiry(value);
    setCustomExpiryError(validateCustomExpiry(value));
  }

  function handleMaxClicksChange(value: string) {
    setMaxClicks(value);
    setMaxClicksError(validateMaxClicks(value));
  }

  async function handleSubmit() {
    const urlErr = validateUrl(url);
    if (urlErr) {
      setTouched(true);
      setUrlError(urlErr);
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitError(null);
    onSubmitting?.(); // notifica o App para animar a Dra. Miúda

    try {
      const expiresIn =
        expiryChoice !== 'custom'
          ? expiryChoiceToSeconds(expiryChoice)
          : undefined; // data específica: pendente de alinhamento com API (A4)

      const link = await createLink({
        url: url.trim(),
        ...(expiresIn !== undefined ? { expiresIn } : {}),
      });

      const hadExpiry = expiresIn !== undefined;
      setCreatedLink(link);
      onLinkCreated?.(hadExpiry);
    } catch (err) {
      setSubmitError(friendlyError(err));
      onSubmitError?.(); // notifica o App para animar a Dra. Miúda
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!createdLink) return;
    const shortUrl = buildShortUrl(createdLink.code);
    try {
      await navigator.clipboard.writeText(shortUrl);
      onLinkCopied?.();
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2500);
    } catch {
      setCopyStatus('failed');
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  }

  function handleNewExperiment() {
    setUrl(''); setMode('mini'); setUrlError(null); setTouched(false);
    setDisplayName(''); setCustomCode(''); setCustomCodeError(null);
    setExpiryChoice('never'); setCustomExpiry(''); setCustomExpiryError(null);
    setMaxClicks(''); setMaxClicksError(null);
    setSubmitError(null); setCreatedLink(null); setCopyStatus('idle');
    setAdvancedOpen(false);
  }

  // ── Tela de resultado ────────────────────────────────────────────────────

  if (createdLink) {
    const shortUrl = buildShortUrl(createdLink.code);
    return (
      <section className="shrink-card shrink-card--result" aria-labelledby="result-title">
        <div className="shrink-card-header">
          <div className="shrink-card-icon shrink-card-icon--success" aria-hidden="true">OK</div>
          <div>
            <p id="result-title" className="shrink-card-title">
              Experimento concluído!
            </p>
            <p className="shrink-card-tagline">
              Seu endereço curto está pronto para compartilhar.
            </p>
          </div>
        </div>

        {/* Efeito visual: URL original → encolhida */}
        <div className="url-transform-viz" aria-hidden="true">
          <span className="url-transform-original">{createdLink.originalUrl}</span>
          <span className="url-transform-arrow">→</span>
          <span className="url-transform-short">{shortUrl}</span>
        </div>

        <div className="result-block">
          <p className="result-label">Link encurtado</p>
          <div className="result-url-row">
            <code className="result-url">{shortUrl}</code>
            <div className="result-actions">
              <button
                type="button"
                className="btn-action"
                onClick={handleCopy}
                aria-label="Copiar link encurtado"
              >
                {copyStatus === 'copied'
                  ? 'Copiado'
                  : copyStatus === 'failed'
                  ? 'Falha ao copiar'
                  : 'Copiar'}
              </button>
              <a
                href={shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-action btn-action--outline"
              >
                Abrir
              </a>
            </div>
          </div>
          {copyStatus === 'failed' && (
            <p className="field-error" role="alert">
              Não foi possível copiar automaticamente. Selecione e copie o link acima.
            </p>
          )}
        </div>

        <div className="result-meta">
          <span>
            Original:{' '}
            <span className="result-meta-value">{createdLink.originalUrl}</span>
          </span>
          {createdLink.expiresAt && (
            <span>
              Expira em:{' '}
              <span className="result-meta-value">
                {new Date(createdLink.expiresAt).toLocaleDateString('pt-BR')}
              </span>
            </span>
          )}
        </div>

        <button
          type="button"
          className="btn-new-experiment"
          onClick={handleNewExperiment}
        >
           Novo experimento
        </button>
      </section>
    );
  }

  // ── Formulário ───────────────────────────────────────────────────────────

  return (
    <section className="shrink-card" aria-labelledby="shrink-form-title">

      <div className="shrink-card-header">
        <div className="shrink-card-icon" aria-hidden="true">↘</div>
        <div>
          <p id="shrink-form-title" className="shrink-card-title">
            Raio Encolhedor
          </p>
          <p className="shrink-card-tagline">
            Cole uma URL para gerar um endereço mais curto.
          </p>
        </div>
      </div>

      {/*
        Aviso de funcionalidades pendentes — sempre visível enquanto o usuário
        tiver algo não suportado selecionado, mesmo com a seção avançada fechada.
        Explica o que está bloqueando e o que fazer para criar o link agora.
      */}
      {hasPending && (
        <div className="pending-notice" role="alert" aria-live="polite">
          <strong> Configurações ainda não disponíveis na API:</strong>{' '}
          {pendingItems.join(', ')}.
          <br />
          Para criar o link agora, selecione <strong>Mini</strong> e remova essas
          configurações. Esses recursos dependem de suporte no servidor.
        </div>
      )}

      {/* Erro de envio */}
      {submitError && (
        <div className="submit-error" role="alert">
          {submitError}
        </div>
      )}

      {/* URL */}
      <div className="form-field">
        <label htmlFor="url-input" className="field-label">
          URL do experimento{' '}
          <span className="field-required" aria-hidden="true">*</span>
        </label>
        <div className="url-field-wrap">
          <input
            id="url-input"
            type="url"
            className={`url-input${urlError && touched ? ' input-error' : ''}`}
            placeholder="https://exemplo.com/url-muito-longa"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onBlur={handleUrlBlur}
            autoComplete="off"
            spellCheck={false}
            aria-required="true"
            aria-describedby={urlError && touched ? 'url-error' : undefined}
            aria-invalid={urlError && touched ? 'true' : undefined}
            disabled={submitting}
          />
          <button
            type="button"
            className={`btn-shrink${submitting ? ' btn-shrink--loading' : ''}`}
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-disabled={!canSubmit ? 'true' : undefined}
            aria-busy={submitting ? 'true' : undefined}
            title={
              hasPending
                ? 'Remova as configurações não suportadas para continuar'
                : !formValid
                ? 'Preencha os campos obrigatórios corretamente'
                : undefined
            }
          >
            {submitting ? (
              <>
                <span className="btn-shrink__spinner" aria-hidden="true" />
                {' '}Encolhendo…
              </>
            ) : 'Encolher'}
          </button>
        </div>
        {urlError && touched && (
          <p id="url-error" className="field-error" role="alert">
            {urlError}
          </p>
        )}
      </div>

      {/* Seletor de modo */}
      <fieldset className="mode-selector">
        <legend className="field-label">Potência do Raio</legend>
        <div className="mode-options">
          {MODES.map((m) => (
            <label
              key={m.id}
              className={[
                'mode-option',
                mode === m.id ? 'active' : '',
                !m.supported ? 'mode-option--pending' : '',
              ].filter(Boolean).join(' ')}
              htmlFor={`mode-${m.id}`}
              title={!m.supported ? 'Em breve — ainda não suportado pela API' : undefined}
            >
              <input
                type="radio"
                id={`mode-${m.id}`}
                name="shrink-mode"
                value={m.id}
                checked={mode === m.id}
                onChange={() => handleModeChange(m.id)}
                className="sr-only"
                disabled={submitting}
              />
              <span className="mode-option-name">{m.label}</span>
              <span className="mode-option-size">{m.chars} caracteres</span>
              <span className="mode-option-desc">
                {m.supported ? m.desc : 'Em breve'}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Seção avançada */}
      <div className="advanced-section">
        <button
          type="button"
          className="advanced-toggle"
          aria-expanded={advancedOpen}
          aria-controls="advanced-fields"
          onClick={() => setAdvancedOpen((prev) => !prev)}
          disabled={submitting}
        >
          <span className="advanced-toggle-icon" aria-hidden="true">
            {advancedOpen ? '▾' : '▸'}
          </span>
          Ajustes do experimento
          <span className="advanced-toggle-hint">
            {' '}(nome, final personalizado, validade, limite)
          </span>
        </button>

        {advancedOpen && (
          <div id="advanced-fields" className="advanced-fields">

            {/* Nome do experimento */}
            <div className="form-field">
              <label htmlFor="display-name" className="field-label">
                Nome do experimento{' '}
                <span className="field-optional">(opcional)</span>
                {' '}<span className="field-pending">Em breve</span>
              </label>
              <input
                id="display-name"
                type="text"
                className="text-input"
                placeholder="ex.: Apresentação do hackathon"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                autoComplete="off"
                disabled={submitting}
              />
              <p className="field-hint">
                Ainda não suportado pela API. Preencher este campo bloqueará
                a criação do link até que o contrato seja atualizado.
              </p>
            </div>

            {/* Final personalizado */}
            <div className="form-field">
              <label htmlFor="custom-code" className="field-label">
                Final personalizado{' '}
                <span className="field-optional">(opcional)</span>
                {' '}<span className="field-pending">Em breve</span>
              </label>
              <input
                id="custom-code"
                type="text"
                className={`text-input mono${customCodeError ? ' input-error' : ''}`}
                placeholder={`ex.: ${'x'.repeat(MODE_CHARS[mode])}`}
                value={customCode}
                onChange={(e) => handleCustomCodeChange(e.target.value)}
                maxLength={MODE_CHARS[mode]}
                autoComplete="off"
                spellCheck={false}
                disabled={submitting}
                aria-describedby={customCodeError ? 'custom-code-error' : 'custom-code-hint'}
                aria-invalid={customCodeError ? 'true' : undefined}
              />
              {customCodeError ? (
                <p id="custom-code-error" className="field-error" role="alert">
                  {customCodeError}
                </p>
              ) : (
                <p id="custom-code-hint" className="field-hint">
                  Exatamente {MODE_CHARS[mode]} caracteres — letras (sem acento) e números.
                  Preencher este campo bloqueará a criação até que a API suporte.
                </p>
              )}
            </div>

            {/* Expiração */}
            <div className="form-field">
              <label htmlFor="expiry-select" className="field-label">
                Validade do link{' '}
                <span className="field-optional">(opcional)</span>
              </label>
              <select
                id="expiry-select"
                className="select-input"
                value={expiryChoice}
                onChange={(e) => handleExpiryChoiceChange(e.target.value as ExpiryChoice)}
                disabled={submitting}
              >
                {EXPIRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {expiryChoice === 'custom' && (
                <div className="form-field form-field--nested">
                  <label htmlFor="custom-expiry" className="field-label">
                    Data de expiração{' '}
                    <span className="field-required" aria-hidden="true">*</span>
                    {' '}<span className="field-pending">Em breve</span>
                  </label>
                  <input
                    id="custom-expiry"
                    type="date"
                    className={`text-input${customExpiryError ? ' input-error' : ''}`}
                    value={customExpiry}
                    min={tomorrowDateString()}
                    onChange={(e) => handleCustomExpiryChange(e.target.value)}
                    disabled={submitting}
                    aria-required="true"
                    aria-describedby={
                      customExpiryError ? 'custom-expiry-error' : 'custom-expiry-hint'
                    }
                    aria-invalid={customExpiryError ? 'true' : undefined}
                  />
                  {customExpiryError ? (
                    <p id="custom-expiry-error" className="field-error" role="alert">
                      {customExpiryError}
                    </p>
                  ) : (
                    <p id="custom-expiry-hint" className="field-hint">
                      Escolha uma data a partir de amanhã. Esta opção bloqueará a
                      criação até alinhamento com a equipe de API (tarefa A4).
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Limite de acessos */}
            <div className="form-field">
              <label htmlFor="max-clicks" className="field-label">
                Limite de acessos{' '}
                <span className="field-optional">(opcional)</span>
                {' '}<span className="field-pending">Em breve</span>
              </label>
              <input
                id="max-clicks"
                type="text"
                inputMode="numeric"
                className={`text-input short${maxClicksError ? ' input-error' : ''}`}
                placeholder="Ilimitado"
                value={maxClicks}
                onChange={(e) => handleMaxClicksChange(e.target.value)}
                autoComplete="off"
                disabled={submitting}
                aria-describedby={maxClicksError ? 'max-clicks-error' : 'max-clicks-hint'}
                aria-invalid={maxClicksError ? 'true' : undefined}
              />
              {maxClicksError ? (
                <p id="max-clicks-error" className="field-error" role="alert">
                  {maxClicksError}
                </p>
              ) : (
                <p id="max-clicks-hint" className="field-hint">
                  Número inteiro positivo. Preencher bloqueará a criação até
                  que a API suporte este campo.
                </p>
              )}
            </div>

          </div>
        )}
      </div>

    </section>
  );
}
