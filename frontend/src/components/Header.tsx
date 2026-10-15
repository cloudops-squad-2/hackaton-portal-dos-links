/**
 * Header — cabeçalho persistente do Laboratório da Dra. Miúda.
 * C1: logo SVG do Raio Encolhedor, identidade de laboratório.
 * C2: responsivo — empilha em telas pequenas sem rolagem horizontal.
 * C3: animação de entrada slideDown.
 */
export function Header() {
  return (
    <header className="header" role="banner">
      <div className="page-wrapper">
        <div className="header-inner">

          {/* Logo: raio SVG inline — temática do laboratório */}
          <div className="header-logo-wrap" aria-hidden="true">
            <svg
              className="header-bolt"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M13 2L4.5 13.5H11L10 22L20.5 10H14L13 2Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Nome e subtítulo */}
          <div className="header-text">
            <p className="header-title">
              Encolhe!{' '}
              <span className="header-title-lab">— Laboratório da Dra. Miúda</span>
            </p>
            <p className="header-subtitle">Encurtador de links · Hackathon CloudOps</p>
          </div>

          {/* Indicador decorativo de laboratório (canto direito) */}
          <div className="header-lab-badge" aria-hidden="true">
            <span className="header-lab-dot" />
            <span className="header-lab-dot" />
            <span className="header-lab-dot" />
          </div>

        </div>
      </div>
    </header>
  );
}
