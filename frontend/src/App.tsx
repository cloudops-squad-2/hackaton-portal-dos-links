
/**
 * App — componente raiz do Encolhe! | Laboratório da Dra. Miúda.
 *
 * C1–C3: identidade, responsividade, animações.
 * C4: busca e ordenação (dentro de ExperimentList).
 * C5: painel de estatísticas e ranking (StatsPanel).
 * C6: conquistas e dica diária (AchievementsPanel).
 * Personagem: DraMiuda com mood reativo ao estado do formulário.
 * Acabamento: toast de conquista, efeito de encolhimento na tela de resultado.
 */

import { useState, useCallback, useRef } from 'react';
import './styles/global.css';
import './styles/components.css';
import { Header } from './components/Header';
import { ShrinkForm } from './components/ShrinkForm';
import type { BeamMode } from './components/ShrinkForm';
import { ExperimentList } from './components/ExperimentList';
import { StatsPanel } from './components/StatsPanel';
import { AchievementsPanel } from './components/AchievementsPanel';
import { DailyTipPanel } from './components/DailyTipPanel';
import { AchievementToast } from './components/AchievementToast';
import { DraMiuda } from './components/DraMiuda';
import type { CharacterMood } from './components/DraMiuda';
import {
  getAllAchievements,
  recordLinkCreated,
  recordLinkCopied,
} from './utils/achievements';
import type { Achievement } from './utils/achievements';
import type { LinkItem, PaginationMeta } from './types/link';

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [listLinks, setListLinks] = useState<LinkItem[]>([]);
  const [listMeta, setListMeta] = useState<PaginationMeta | null>(null);
  const [achievements, setAchievements] = useState(
    () => getAllAchievements()
  );
  const [ownershipRevision, setOwnershipRevision] = useState(0);

  // Toast de conquista
  const [toastAchievement, setToastAchievement] =
    useState<Achievement | null>(null);

  const toastTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(achievement: Achievement) {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToastAchievement(achievement);

    toastTimerRef.current = setTimeout(
      () => setToastAchievement(null),
      3500
    );
  }

  // Estado de humor da Dra. Miúda
  const [characterMood, setCharacterMood] =
    useState<CharacterMood>('idle');

  const [beamMode, setBeamMode] =
    useState<BeamMode>('instant');

  const moodTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  function setMoodTemporary(
    mood: CharacterMood,
    durationMs = 3000
  ) {
    if (moodTimerRef.current) {
      clearTimeout(moodTimerRef.current);
    }

    setCharacterMood(mood);

    moodTimerRef.current = setTimeout(
      () => setCharacterMood('idle'),
      durationMs
    );
  }

  function handleFormSubmitting() {
    if (moodTimerRef.current) {
      clearTimeout(moodTimerRef.current);
    }

    setCharacterMood('working');
  }

  function handleLinkCreated(
    hadExpiry: boolean,
    link: LinkItem
  ) {
    try {
      const key = 'encolhe-local-links-v2';
      const saved: unknown = JSON.parse(
        localStorage.getItem(key) ?? '[]'
      );

      const codes = Array.isArray(saved)
        ? saved.filter(
            (v): v is string => typeof v === 'string'
          )
        : [];

      localStorage.setItem(
        key,
        JSON.stringify([
          ...new Set([...codes, link.code]),
        ])
      );
    } catch {
      // Armazenamento opcional
    }

    setOwnershipRevision((n) => n + 1);
    setMoodTemporary('success', 3500);
    setRefreshKey((prev) => prev + 1);

    // Registra conquistas e exibe toast
    const newlyUnlocked = recordLinkCreated(hadExpiry);

    setAchievements(getAllAchievements());

    if (newlyUnlocked.length > 0) {
      showToast(newlyUnlocked[0]);
    }
  }

  function handleFormError() {
    setMoodTemporary('error', 2500);
  }

  function handleLinkCopied() {
    const newlyUnlocked = recordLinkCopied();

    setAchievements(getAllAchievements());

    if (newlyUnlocked.length > 0) {
      showToast(newlyUnlocked[0]);
    }
  }

  const handleDataChange = useCallback(
    (links: LinkItem[], meta: PaginationMeta | null) => {
      setListLinks(links);
      setListMeta(meta);
    },
    []
  );

  return (
    <>
      <Header />

      <main className="main-content lab-main">
        {/* Apresentação do laboratório */}
        <section
          className="hero-section lab-hero animate-fade-up"
          aria-labelledby="hero-title"
        >
          <div className="lab-hero-copy">
            <p className="lab-eyebrow">
              LABORATÓRIO DA DRA. MIÚDA · DESDE 2026
            </p>

            <h1
              id="hero-title"
              className="hero-title lab-hero-title"
            >
              Cansou de links{' '}
              <span className="lab-title-white">
                gigantes?
              </span>{' '}
              <span className="highlight">
                Ligue o Raio Encolhedor!
              </span>
            </h1>

            <p className="hero-description lab-hero-description">
              Cansada de endereços intermináveis, a Dra. Miúda
              inventou um raio que encolhe links sem mudar aonde
              eles levam. Agora você pode experimentar essa
              descoberta no laboratório dela.
            </p>

            <details className="lab-story">
              <summary>
                Conheça a história da invenção{' '}
                <span aria-hidden="true">↗</span>
              </summary>

              <div className="lab-story-body">
                <p>
                  A Dra. Miúda adorava transformar grandes ideias
                  em pequenas invenções. Entre experiências e
                  faíscas, nasceu o Encolhe!: um laboratório onde
                  o Raio Encolhedor transforma endereços gigantes
                  em links compactos, sem mudar o destino.
                </p>

                <p>
                  Agora o laboratório está aberto para suas
                  próprias descobertas!
                </p>
              </div>
            </details>
          </div>

          <div
            className={`lab-hero-visual lab-hero-visual--${beamMode} lab-hero-visual--${characterMood}`}
          >
            <div className="hero-character">
              <div className="hero-character-frame">
                <DraMiuda mood={characterMood} />
              </div>

              <div className="hero-ray hero-ray--1" />
              <div className="hero-ray hero-ray--2" />
              <div className="hero-ray hero-ray--3" />

              <span
                className="lab-spark lab-spark--a"
                aria-hidden="true"
              />

              <span
                className="lab-spark lab-spark--b"
                aria-hidden="true"
              />
            </div>

            <div
              className="lab-character-caption"
              role="status"
              aria-live="polite"
            >
              <span
                className="lab-status-dot"
                aria-hidden="true"
              />

              {characterMood === 'working'
                ? 'Dra. Miúda está disparando o raio…'
                : characterMood === 'success'
                  ? 'Experimento aprovado pela cientista!'
                  : characterMood === 'error'
                    ? 'Ops! A cientista está recalibrando o raio.'
                    : beamMode === 'custom'
                      ? 'Dra. Miúda está pronta para personalizar seu link!'
                      : 'Dra. Miúda — pronta para seu próximo experimento'}
            </div>
          </div>
        </section>

        <div className="lab-workspace">
          <div className="lab-primary">
            <div className="full-width-card animate-fade-up animate-delay-1">
              <ShrinkForm
                onLinkCreated={handleLinkCreated}
                onLinkCopied={handleLinkCopied}
                onSubmitting={handleFormSubmitting}
                onSubmitError={handleFormError}
                onModeChange={setBeamMode}
              />
            </div>

            <div className="lab-section-intro">
              <div>
                <p className="lab-eyebrow">
                  ARQUIVO DE EXPERIÊNCIAS
                </p>

                <h2>Seus experimentos</h2>

                <p>
                  Acompanhe e organize os links criados no
                  laboratório.
                </p>
              </div>
            </div>

            <div className="full-width-card animate-fade-up animate-delay-2">
              <ExperimentList
                refreshKey={refreshKey}
                onDataChange={handleDataChange}
                onOwnershipChange={() =>
                  setOwnershipRevision((n) => n + 1)
                }
              />
            </div>
          </div>

          <aside
            className="lab-sidebar"
            aria-label="Painéis do laboratório"
          >
            <div className="lab-side-card lab-side-card--daily animate-fade-up animate-delay-2">
              <DailyTipPanel />
            </div>

            {/* Indicadores visíveis somente quando há dados */}
            {(listLinks.length > 0 || listMeta !== null) && (
              <div className="lab-side-card lab-side-card--stats animate-fade-up animate-delay-2">
                <StatsPanel
                  links={listLinks}
                  meta={listMeta}
                  ownershipRevision={ownershipRevision}
                />
              </div>
            )}

            <div className="lab-side-card lab-side-card--achievements animate-fade-up animate-delay-2">
              <AchievementsPanel achievements={achievements} />
            </div>
          </aside>
        </div>
      </main>

      <footer className="footer">
        <p>
          <span className="footer-lab">
            Laboratório da Dra. Miúda
          </span>
          {' · '}Encolhe! — Raio Encolhedor de URLs
          {' · '}Hackathon CloudOps
        </p>
      </footer>

      {/* Toast de conquista */}
      <AchievementToast achievement={toastAchievement} />
    </>
  );
}

export default App;
