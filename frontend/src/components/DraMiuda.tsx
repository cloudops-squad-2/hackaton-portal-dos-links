/** Mascote vetorial do Encolhe!, com expressões controladas pelo estado. */

export type CharacterMood = 'idle' | 'working' | 'success' | 'error';

interface DraMiudaProps {
  mood?: CharacterMood;
  label?: string;
}

const C = {
  skin:       '#f5c5a3',
  skinDark:   '#e8a882',
  hair:       '#5a3626',
  hairHigh:   '#7d4f38',
  hairBack:   '#45291d',
  coat:       '#1a3a5c',
  coatLight:  '#1f4d7a',
  teal:       '#2dd4bf',
  tealDark:   '#14b8a6',
  orange:     '#f97316',
  orangeLight:'#fba04b',
  white:      '#f8fafc',
  coatShade:  '#dbe7f0',
  sleeveEdge: '#8fa9bd',
  gloveEdge:  '#c2570c',
  eyeWhite:   '#ffffff',
  eyePupil:   '#0d1b2a',
  eyeShine:   '#ffffff',
  mouth:      '#c47a55',
  lensFrame:  '#111827',
  // Raio Encolhedor
  gunBody:    '#14b8a6',
  gunShade:   '#0f766e',
  gunAccent:  '#243b55',
  gunBarrel:  '#0d1b2a',
  crystalOff: '#115e59',
  crystalOn:  '#2dd4bf',
  energyGlow: '#f97316',
};

// Trajetos dos braços (ombro → cotovelo → mão), reutilizados no contorno e no preenchimento.
const ARM_LEFT_PATH  = 'M31 81 L18 97 L30 108';
const ARM_RIGHT_PATH = 'M79 81 L89 101 L104 100';

function moodLabel(mood: CharacterMood): string {
  const labels: Record<CharacterMood, string> = {
    idle:    'aguardando',
    working: 'encolhendo o link',
    success: 'comemoração — link criado!',
    error:   'algo deu errado',
  };
  return labels[mood];
}

export function DraMiuda({ mood = 'idle', label }: DraMiudaProps) {
  const moodClass = `dra-miuda--${mood}`;
  const ariaLabel = label ?? `Dra. Miúda — ${moodLabel(mood)}`;

  return (
    <svg
      className={`dra-miuda-svg ${moodClass}`}
      viewBox="0 -6 172 150"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
    >
      <title>{ariaLabel}</title>

      {/* CORPO / JALECO */}
      <g className="dra-miuda__body" aria-hidden="true">
        {/* Jaleco branco */}
        <path d="M30 82 Q29 72 40 71 L70 71 Q81 72 80 82 L82 122 L28 122 Z" fill={C.white} />
        <path d="M70 71 Q81 72 80 82 L82 122 L74 122 L74 80 Z" fill={C.coatShade} opacity="0.7" />
        {/* Roupa escura aparecendo na abertura do jaleco */}
        <path d="M45 71 L65 71 L60 122 L50 122 Z" fill={C.coat} />
        {/* Lapelas */}
        <path d="M43 71 L55 86 L42 82 Z" fill={C.coatShade} stroke={C.sleeveEdge}
          strokeWidth="0.8" strokeLinejoin="round" />
        <path d="M67 71 L55 86 L68 82 Z" fill={C.coatShade} stroke={C.sleeveEdge}
          strokeWidth="0.8" strokeLinejoin="round" />
        {/* Canetas e bolso com raio decorativo */}
        <rect x="36" y="90.5" width="2" height="5" rx="1" fill={C.teal} />
        <rect x="40" y="91.5" width="2" height="4" rx="1" fill={C.orange} />
        <rect x="33" y="94" width="13" height="12" rx="2" fill={C.coatShade}
          stroke={C.sleeveEdge} strokeWidth="0.8" />
        <path d="M38 96 L35.5 100 L37.5 100 L37 104 L40.5 99 L38.5 99 Z" fill={C.orange} />
      </g>

      {/* O aparelho fica atrás da mão para preservar a pegada. */}
      <g className="dra-miuda__ray-gun" aria-hidden="true">
        {/* Câmara de energia: metade escondida atrás do corpo */}
        <circle className="dra-miuda__crystal" cx="116" cy="77" r="7.5" fill={C.crystalOff}
          stroke={C.teal} strokeWidth="1.5" />
        <circle className="dra-miuda__crystal-error" cx="116" cy="77" r="7.5"
          fill="#f87171" opacity="0" />
        {/* Aleta traseira */}
        <path d="M101 78 L93 72 L95 82 L93 90 L101 88 Z" fill={C.orange} />
        {/* Corpo */}
        <path d="M101 80 Q101 77 105 77 L126 77 Q130 77 130 81 L130 89 Q130 93 126 93 L105 93 Q101 93 101 89 Z"
          fill={C.gunBody} stroke={C.gunBarrel} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M102 89 L129 89 L129 90 Q129 92 126 92 L105 92 Q102 92 102 90 Z"
          fill={C.gunShade} opacity="0.6" />
        <rect x="105" y="82" width="10" height="2.4" rx="1.2" fill={C.orange} />
        {/* Manômetro */}
        <circle cx="123" cy="85" r="3" fill={C.gunBarrel} stroke={C.orange} strokeWidth="1" />
        <path d="M123 85 L124.6 83.4" stroke={C.orangeLight} strokeWidth="1" strokeLinecap="round" />
        {/* Base da câmara e reflexo */}
        <rect x="108" y="75.5" width="16" height="3.5" rx="1.75" fill={C.orange} />
        <circle cx="113.5" cy="72.5" r="1.8" fill={C.white} opacity="0.7" />
        {/* Cano com anéis */}
        <path d="M130 82 L137 80 L137 90 L130 88 Z" fill={C.gunShade} />
        <path d="M132.5 81.5 L132.5 88.5 M135 80.8 L135 89.2" stroke={C.gunBarrel}
          strokeWidth="1.2" />
        {/* Funil emissor */}
        <path d="M137 79 L145.5 73 L145.5 97 L137 91 Z" fill={C.orange}
          stroke={C.gloveEdge} strokeWidth="1" strokeLinejoin="round" />
        <ellipse cx="145.5" cy="85" rx="3" ry="12" fill={C.gunBarrel}
          stroke={C.orangeLight} strokeWidth="1.2" />
        <ellipse cx="146" cy="85" rx="1.4" ry="7" fill={C.teal} />
        {/* Punho e guarda-mato */}
        <path d="M103 93 L112 93 L110 109 Q109.5 112 106 112 L104 111 Q102 110 102.5 107 Z"
          fill={C.gunAccent} stroke={C.gunBarrel} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M113 93 Q119 96 114 101" fill="none" stroke={C.orangeLight}
          strokeWidth="2" strokeLinecap="round" />

        {/* O feixe ganha intensidade conforme o estado da personagem. */}
        <g className="dra-miuda__energy-waves">
          <path d="M148 73 L164 82.5 L164 87.5 L148 97 Z" fill={C.teal} opacity="0.3" />
          <path d="M148 79 L163 84 L163 86 L148 91 Z" fill={C.teal} opacity="0.6" />
          <path className="dra-miuda__wave dra-miuda__wave--1" d="M152 76 Q155.5 85 152 94"
            fill="none" stroke={C.teal} strokeWidth="1.6" strokeLinecap="round" />
          <path className="dra-miuda__wave dra-miuda__wave--2" d="M156.5 79 Q159 85 156.5 91"
            fill="none" stroke={C.orangeLight} strokeWidth="1.5" strokeLinecap="round" />
          <path className="dra-miuda__wave dra-miuda__wave--3" d="M160.5 82 Q162 85 160.5 88"
            fill="none" stroke={C.teal} strokeWidth="1.4" strokeLinecap="round" />
        </g>
        {/* Raio e faíscas no eixo do feixe */}
        <g className="dra-miuda__spark">
          <path d="M148 85 L152 81.5 L154.5 87.5 L158.5 83 L162 85" fill="none"
            stroke={C.orange} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="161" cy="77" r="1" fill={C.orangeLight} />
          <circle cx="165" cy="86" r="1.2" fill={C.teal} />
          <circle cx="158" cy="93" r="0.9" fill={C.orangeLight} />
        </g>
      </g>

      {/* Mangas, cotovelos e luvas. */}
      <g className="dra-miuda__arms" aria-hidden="true">
        {/* Braço esquerdo: mão na cintura, cotovelo para fora */}
        <g className="dra-miuda__arm-left">
          <path d={ARM_LEFT_PATH} fill="none" stroke={C.sleeveEdge} strokeWidth="12.5"
            strokeLinecap="round" strokeLinejoin="round" />
          <path d={ARM_LEFT_PATH} fill="none" stroke={C.white} strokeWidth="10.5"
            strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="32" cy="108.5" rx="6" ry="5.5" fill={C.orange}
            stroke={C.gloveEdge} strokeWidth="1" />
        </g>
        {/* Braço direito: empunha o aparelho pelo punho */}
        <g className="dra-miuda__arm-right">
          <path d={ARM_RIGHT_PATH} fill="none" stroke={C.sleeveEdge} strokeWidth="12.5"
            strokeLinecap="round" strokeLinejoin="round" />
          <path d={ARM_RIGHT_PATH} fill="none" stroke={C.white} strokeWidth="10.5"
            strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="107" cy="100" rx="6.4" ry="6" fill={C.orange}
            stroke={C.gloveEdge} strokeWidth="1" />
          <path d="M108.5 97.5 L112.5 97.5 M108.5 100 L112.8 100 M108.5 102.5 L112.5 102.5"
            stroke={C.gloveEdge} strokeWidth="0.9" strokeLinecap="round" />
        </g>
      </g>

      {/* CABEÇA */}
      <g className="dra-miuda__head" aria-hidden="true">
        {/* Cabelo (atrás): altura dos ombros, desenhado antes do rosto */}
        <path d="M23 44 Q22 14 55 10 Q88 14 87 44 Q88 58 82 69 L72 66 L38 66 L28 69 Q22 58 23 44 Z"
          fill={C.hairBack} />

        {/* Pescoço */}
        <rect x="47" y="62" width="16" height="14" rx="4" fill={C.skin} />

        {/* Rosto */}
        <ellipse cx="55" cy="44" rx="24" ry="26" fill={C.skin} />
        {/* Sombra lateral */}
        <ellipse cx="71" cy="46" rx="8" ry="18" fill={C.skinDark} opacity="0.2" />

        {/* ── Cabelo (frente) ──
            Faixa no alto com repartido lateral: cobre só a parte de cima da
            testa e deixa olhos e laterais do rosto livres. O resto do cabelo está atrás da cabeça. */}
        <path d="M29 42 Q25 14 55 11 Q85 14 81 42 Q80 36 73 33 Q62 30 50 27 Q40 31 34 37 Q31 39 29 42 Z"
          fill={C.hair} />
        <path d="M40 15 Q52 10 66 14" fill="none" stroke={C.hairHigh} strokeWidth="1.6"
          strokeLinecap="round" opacity="0.8" />

        {/* Óculos */}
        <rect x="32" y="38" width="18" height="14" rx="5"
          fill="none" stroke={C.lensFrame} strokeWidth="2" />
        <rect x="33" y="39" width="16" height="12" rx="4"
          fill={C.white} opacity="0.18" />
        <rect x="58" y="38" width="18" height="14" rx="5"
          fill="none" stroke={C.lensFrame} strokeWidth="2" />
        <rect x="59" y="39" width="16" height="12" rx="4"
          fill={C.white} opacity="0.18" />
        <line x1="50" y1="45" x2="58" y2="45" stroke={C.lensFrame} strokeWidth="2" />
        <line x1="32" y1="45" x2="26" y2="45" stroke={C.lensFrame} strokeWidth="1.5" />
        <line x1="76" y1="45" x2="82" y2="45" stroke={C.lensFrame} strokeWidth="1.5" />

        {/* ── Olhos ──
            IMPORTANTE: não usar grupo wrapper com animação de escala —
            o piscar é aplicado diretamente nas pupilas (.dra-miuda__pupil)
            com transform-box: fill-box no CSS, garantindo que o
            transform-origin fique no centro da própria ellipse.
        ── */}
        {/* Olho esquerdo */}
        <ellipse cx="41" cy="45" rx="5" ry="5" fill={C.eyeWhite} />
        <ellipse
          className="dra-miuda__pupil dra-miuda__pupil--left"
          cx="41" cy="45" rx="3" ry="3"
          fill={C.eyePupil}
        />
        <ellipse cx="42.5" cy="43.5" rx="1" ry="1" fill={C.eyeShine} />

        {/* Olho direito */}
        <ellipse cx="68" cy="45" rx="5" ry="5" fill={C.eyeWhite} />
        <ellipse
          className="dra-miuda__pupil dra-miuda__pupil--right"
          cx="68" cy="45" rx="3" ry="3"
          fill={C.eyePupil}
        />
        <ellipse cx="69.5" cy="43.5" rx="1" ry="1" fill={C.eyeShine} />

        {/* Boca */}
        <path
          className="dra-miuda__smile"
          d="M48 56 Q55 60 62 56"
          stroke={C.mouth} strokeWidth="2"
          fill="none" strokeLinecap="round"
        />
        <ellipse
          className="dra-miuda__mouth-open"
          cx="55" cy="57" rx="4" ry="3"
          fill={C.mouth}
        />

        {/* Bochechas (sucesso) */}
        <g className="dra-miuda__blush">
          <ellipse cx="34" cy="52" rx="5" ry="3" fill={C.orange} opacity="0.3" />
          <ellipse cx="76" cy="52" rx="5" ry="3" fill={C.orange} opacity="0.3" />
        </g>

        {/* Estrelinhas (sucesso) */}
        <g className="dra-miuda__stars">
          <path className="dra-miuda__star dra-miuda__star--1"
            d="M18 24 L20 30 L26 32 L20 34 L18 40 L16 34 L10 32 L16 30 Z" fill={C.orange} />
          <path className="dra-miuda__star dra-miuda__star--2"
            d="M92 21 L94 26 L99 28 L94 30 L92 35 L90 30 L85 28 L90 26 Z" fill={C.teal} />
          <path className="dra-miuda__star dra-miuda__star--3"
            d="M14 46 L15.5 50.5 L20 52 L15.5 53.5 L14 58 L12.5 53.5 L8 52 L12.5 50.5 Z" fill={C.orange} />
        </g>

        {/* Gota de suor (erro) */}
        <g className="dra-miuda__sweat">
          <ellipse className="dra-miuda__sweat-drop"
            cx="24" cy="36" rx="3" ry="4"
            fill={C.teal} opacity="0.7"
          />
        </g>
      </g>
    </svg>
  );
}
