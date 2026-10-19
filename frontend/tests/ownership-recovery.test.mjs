
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) =>
  readFileSync(new URL(file, import.meta.url), 'utf8');

test('Histórico não oferece recuperação manual de propriedade', () => {
  const s = read('../src/components/ExperimentList.tsx');

  assert.doesNotMatch(s, /Você confirma que criou este link/);
  assert.doesNotMatch(s, /É meu link/);
  assert.doesNotMatch(s, /recognizeAsMine/);
});

test('Indicadores usam somente links reconhecidos e cliques reais da API', () => {
  const s = read('../src/components/StatsPanel.tsx');

  assert.match(s, /codes\.includes\(l\.code\)/);
  assert.match(
    s,
    /mine\.reduce\(\(sum, l\) => sum \+ l\.clickCount/
  );
});
