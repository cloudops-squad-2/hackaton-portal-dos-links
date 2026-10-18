import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');

test('Histórico oferece recuperação explícita de propriedade', () => {
  const s = read('../src/components/ExperimentList.tsx');
  assert.match(s, /Você confirma que criou este link/);
  assert.match(s, /localStorage\.setItem\(OWNED_KEY, JSON\.stringify\(next\)\)/);
  assert.match(s, /!ownedCodes\.includes\(link\.code\)/);
});

test('Indicadores usam somente links reconhecidos e cliques reais da API', () => {
  const s = read('../src/components/StatsPanel.tsx');
  assert.match(s, /codes\.includes\(l\.code\)/);
  assert.match(s, /mine\.reduce\(\(sum, l\) => sum \+ l\.clickCount/);
});
