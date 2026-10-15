import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// D5: inicializa instrumentação OTel antes de montar a árvore React.
// No-op quando VITE_OTEL_ENABLED não é "true" — sem custo em produção.
import { initOtel } from './telemetry/otel.ts';

initOtel();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
