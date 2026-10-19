
/**
 * ShrinkForm — formulário do Raio Encolhedor.
 *
 * Raio Padrão: código automático.
 * Raio Sob Medida: código personalizado de 5 a 9 caracteres.
 * Preserva o contrato atual de criação de links.
 */

import { useEffect, useRef, useState } from 'react';
import { createLink, friendlyError } from '../services/api';
import { expiryChoiceToSeconds } from '../types/link';
import type { LinkItem } from '../types/link';
import { validateUrl, validateCustomCode } from '../utils/validation';

export type BeamMode = 'instant' | 'custom';
type ExpiryChoice = 'never' | '1d' | '7d' | '30d';

interface ShrinkFormProps {
  onLinkCreated?: (hadExpiry: boolean, link: LinkItem) => void;
  onLinkCopied?: () => void;
  onSubmitting?: () => void;
  onSubmitError?: () => void;
  onModeChange?: (mode: BeamMode) => void;
}

const PUBLIC_BASE: string =
  (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined) ?? '';

function buildShortUrl(code: string): string {
  const base = PUBLIC_BASE.replace(/\/$/, '') || window.location.origin;
  return `${base}/s/${code}`;
}

const EXPIRY_OPTIONS: { value: ExpiryChoice; label: string }[] = [
  { value: 'never', label: 'Sem validade definida' },
  { value: '1d', label: '1 dia' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
];

export function ShrinkForm({
  onLinkCreated,
  onLinkCopied,
  onSubmitting,
  onSubmitError,
  onModeChange,
}: ShrinkFormProps) {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<BeamMode>('instant');
  const [customCode, setCustomCode] = useState('');
  const [expiryChoice, setExpiryChoice] = useState<ExpiryChoice>('never');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<LinkItem | null>(null);
  const [copyStatus, setCopyStatus] =
    useState<'idle' | 'copied' | 'failed'>('idle');

  const copyTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
    }
  }, []);

  function showCopyStatus(status: 'copied' | 'failed') {
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
    }

    setCopyStatus(status);

    copyTimerRef.current = setTimeout(() => {
      setCopyStatus('idle');
      copyTimerRef.current = null;
    }, status === 'copied' ? 2500 : 3000);
  }

  const urlError = touched ? validateUrl(url) : null;

  const customCodeError = customCode
    ? (
        validateCustomCode(customCode, customCode.length) ??
        (
          customCode.length < 5 || customCode.length > 9
            ? 'Escolha de 5 a 9 letras ou números.'
            : null
        )
      )
    : null;

  // O contrato atual não envia códigos personalizados.
  const customUnavailable = mode === 'custom';

  const canSubmit =
    validateUrl(url) === null &&
    !customUnavailable &&
    !submitting;

  function chooseMode(next: BeamMode) {
    setMode(next);
    setSubmitError(null);
    onModeChange?.(next);
  }

  async function handleSubmit() {
    setTouched(true);

    if (
      validateUrl(url) !== null ||
      customUnavailable ||
      submitting
    ) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    onSubmitting?.();

    try {
      const expiresIn = expiryChoiceToSeconds(expiryChoice);

      const link = await createLink({
        url: url.trim(),
        ...(expiresIn !== undefined ? { expiresIn } : {}),
      });

      setCreatedLink(link);
      onLinkCreated?.(expiresIn !== undefined, link);
    } catch (error) {
      setSubmitError(friendlyError(error));
      onSubmitError?.();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!createdLink) return;

    try {
      await navigator.clipboard.writeText(
        buildShortUrl(createdLink.code)
      );

      showCopyStatus('copied');
      onLinkCopied?.();
    } catch {
      showCopyStatus('failed');
    }
  }

  function handleNewExperiment() {
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }

    setUrl('');
    setMode('instant');
    onModeChange?.('instant');
    setCustomCode('');
    setExpiryChoice('never');
    setAdvancedOpen(false);
    setTouched(false);
    setSubmitting(false);
    setSubmitError(null);
    setCreatedLink(null);
    setCopyStatus('idle');
  }

  if (createdLink) {
    const shortUrl = buildShortUrl(createdLink.code);

    return (
      <section
        className="shrink-card shrink-card--result v2-result"
        aria-labelledby="result-title"
      >
        <div className="shrink-card-header">
          <span
            className="shrink-card-icon shrink-card-icon--success"
            aria-hidden="true"
          >
            OK
          </span>

          <div>
            <p id="result-title" className="shrink-card-title">
              Experimento concluído!
            </p>

            <p className="shrink-card-tagline">
              A invenção da Dra. Miúda funcionou.
              Seu link está pronto!
            </p>
          </div>
        </div>

        <div className="url-transform-viz" aria-hidden="true">
          <span className="url-transform-original">
            {createdLink.originalUrl}
          </span>

          <span className="url-transform-arrow">→</span>

          <span className="url-transform-short">
            {shortUrl}
          </span>
        </div>

        <div className="result-block">
          <p className="result-label">
            Seu link encolhido
          </p>

          <div className="result-url-row">
            <code className="result-url">
              {shortUrl}
            </code>

            <div className="result-actions">
              <button
                type="button"
                className="btn-action"
                onClick={handleCopy}
              >
                {copyStatus === 'copied' ? 'Copiado!' : 'Copiar'}
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

          <p
            className="v2-copy-feedback"
            role="status"
            aria-live="polite"
          >
            {copyStatus === 'failed'
              ? 'Não foi possível copiar automaticamente. Selecione o endereço acima.'
              : copyStatus === 'copied'
                ? 'Link copiado para a área de transferência.'
                : ''}
          </p>
        </div>

        <div className="result-meta">
          <span>
            Original:{' '}
            <span className="result-meta-value">
              {createdLink.originalUrl}
            </span>
          </span>

          {createdLink.expiresAt && (
            <span>
              Validade:{' '}
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

  return (
    <section
      className="shrink-card v2-shrink-card"
      aria-labelledby="shrink-form-title"
    >
      <div className="shrink-card-header">
        <span className="shrink-card-icon" aria-hidden="true">
          ↘
        </span>

        <div>
          <p id="shrink-form-title" className="shrink-card-title">
            Bancada de experimentos
          </p>

          <p className="shrink-card-tagline">
            Um link gigante entra. Uma versão de bolso sai.
          </p>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
        noValidate
      >
        <div className="form-field">
          <label htmlFor="url-input" className="field-label">
            Cole o endereço original
          </label>

          <input
            id="url-input"
            type="url"
            className={`url-input v2-url-input${urlError ? ' input-error' : ''}`}
            placeholder="https://exemplo.com/um-endereco-gigante"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setSubmitError(null);
            }}
            onBlur={() => setTouched(true)}
            autoComplete="url"
            spellCheck={false}
            aria-invalid={Boolean(urlError)}
            aria-describedby={urlError ? 'url-error' : undefined}
            disabled={submitting}
            required
          />

          {urlError && (
            <p className="field-error" id="url-error" role="alert">
              {urlError}
            </p>
          )}
        </div>

        <fieldset className="mode-selector v2-mode-selector">
          <legend className="field-label">
            Escolha a invenção da Dra. Miúda
          </legend>

          <div className="mode-options v2-mode-options">
            <label
              className={`mode-option v2-mode-card${mode === 'instant' ? ' active' : ''}`}
              htmlFor="mode-instant"
            >
              <input
                id="mode-instant"
                type="radio"
                name="shrink-mode"
                className="sr-only"
                checked={mode === 'instant'}
                onChange={() => chooseMode('instant')}
                disabled={submitting}
              />

              <span className="v2-mode-symbol" aria-hidden="true">
                ↯
              </span>

              <span className="mode-option-name">
                Raio Padrão
              </span>

              <span className="mode-option-size">
                Automático · 7 caracteres
              </span>

              <span className="mode-option-desc">
                Um código de 7 caracteres, gerado automaticamente.
              </span>

              <span className="v2-mode-state">
                Disponível agora
              </span>
            </label>

            <label
              className={`mode-option v2-mode-card v2-mode-card--custom${mode === 'custom' ? ' active' : ''}`}
              htmlFor="mode-custom"
            >
              <input
                id="mode-custom"
                type="radio"
                name="shrink-mode"
                className="sr-only"
                checked={mode === 'custom'}
                onChange={() => chooseMode('custom')}
                disabled={submitting}
              />

              <span className="v2-mode-symbol" aria-hidden="true">
                ✧
              </span>

              <span className="mode-option-name">
                Raio Sob Medida
              </span>

              <span className="mode-option-size">
                Personalizado · 5 a 9 caracteres
              </span>

              <span className="mode-option-desc">
                Escolha um código de 5 a 9 letras ou números.
              </span>
            </label>
          </div>
        </fieldset>

        {mode === 'custom' && (
          <div className="v2-custom-preview">
            <div className="v2-custom-head">
              <strong>Personalize seu código</strong>
            </div>

            <p className="field-hint" role="note">
              Escolha de 5 a 9 letras ou números para o final
              do seu link, por exemplo{' '}
              <code>/s/miyu123</code>.
              O código precisa estar disponível.
            </p>

            <label htmlFor="custom-code" className="field-label">
              Como você gostaria de chamar seu link?
            </label>

            <input
              id="custom-code"
              className={`text-input mono${customCodeError ? ' input-error' : ''}`}
              type="text"
              value={customCode}
              minLength={5}
              maxLength={9}
              placeholder="ex.: miyu123"
              onChange={(event) =>
                setCustomCode(event.target.value)
              }
              spellCheck={false}
              aria-describedby="custom-code-help"
              aria-invalid={Boolean(customCodeError)}
              disabled={submitting}
            />

            <p
              id="custom-code-help"
              className={customCodeError ? 'field-error' : 'field-hint'}
            >
              {customCodeError ??
                'Digite entre 5 e 9 letras ou números.'}
            </p>

            <p className="v2-custom-example">
              Código escolhido:{' '}
              <code>/s/{customCode || 'miyu123'}</code>
            </p>

            <button
              type="button"
              className="v2-back-to-ray"
              onClick={() => chooseMode('instant')}
            >
              Voltar ao Raio Padrão →
            </button>
          </div>
        )}

        <div className="advanced-section v2-advanced-section">
          <button
            type="button"
            className="advanced-toggle"
            aria-expanded={advancedOpen}
            aria-controls="advanced-fields"
            onClick={() => setAdvancedOpen((open) => !open)}
            disabled={submitting}
          >
            <span
              className="advanced-toggle-icon"
              aria-hidden="true"
            >
              {advancedOpen ? '▾' : '▸'}
            </span>

            Ajustar a validade{' '}
            <span className="advanced-toggle-hint">
              (opcional)
            </span>
          </button>

          <div
            id="advanced-fields"
            className="advanced-fields"
            hidden={!advancedOpen}
          >
            <div className="form-field">
              <label
                className="field-label"
                htmlFor="expiry-select"
              >
                Quando o link deve expirar?
              </label>

              <select
                id="expiry-select"
                className="select-input"
                value={expiryChoice}
                onChange={(event) => {
                  setExpiryChoice(
                    event.target.value as ExpiryChoice
                  );
                  setSubmitError(null);
                }}
                disabled={submitting}
              >
                {EXPIRY_OPTIONS.map(({ value, label }) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {submitError && (
          <div role="alert" className="submit-error">
            {submitError}
          </div>
        )}

        <div className="v2-submit-wrap">
          <button
            type="submit"
            className={`btn-shrink v2-submit${submitting ? ' btn-shrink--loading' : ''}`}
            disabled={!canSubmit}
            aria-busy={submitting}
          >
            {submitting ? (
              <>
                <span
                  className="btn-shrink__spinner"
                  aria-hidden="true"
                />
                {' '}Preparando o raio…
              </>
            ) : (
              'Disparar Raio Encolhedor'
            )}
          </button>

          {mode === 'instant' && (
            <p className="v2-submit-note">
              Sem mistério: o laboratório cuida do resto.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
