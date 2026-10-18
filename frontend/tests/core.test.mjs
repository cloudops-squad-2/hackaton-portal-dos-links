/** Testes locais sem bibliotecas extras; executados com `npm test`. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';

async function loadPureTs(relativePath) {
  const code = await readFile(resolve(import.meta.dirname, '..', relativePath), 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    fileName: relativePath,
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`);
}

const validation = await loadPureTs('src/utils/validation.ts');
const link = await loadPureTs('src/types/link.ts');

function mockStorage() {
  const storage = new Map();
  return {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
    clear: () => storage.clear(),
  };
}
globalThis.localStorage = mockStorage();
const achievements = await loadPureTs('src/utils/achievements.ts');

test('URL: aceita HTTP e HTTPS, rejeita vazio e protocolos inseguros', () => {
  assert.equal(validation.validateUrl(' https://exemplo.com/rota '), null);
  assert.equal(validation.validateUrl('http://exemplo.com'), null);
  assert.ok(validation.validateUrl(''));
  assert.ok(validation.validateUrl('javascript:alert(1)'));
  assert.ok(validation.validateUrl('ftp://exemplo.com'));
  assert.ok(validation.validateUrl('exemplo.com'));
});

test('Códigos personalizados: opcionais, alfanuméricos e tamanho exato', () => {
  assert.equal(validation.validateCustomCode('', 7), null);
  assert.equal(validation.validateCustomCode('abc1234', 7), null);
  assert.ok(validation.validateCustomCode('abc12', 7));
  assert.ok(validation.validateCustomCode('abc-123', 7));
});

test('Limite de acessos: inteiro positivo seguro ou vazio', () => {
  assert.equal(validation.validateMaxClicks(''), null);
  assert.equal(validation.validateMaxClicks('1'), null);
  assert.equal(validation.validateMaxClicks('5000'), null);
  for (const invalid of ['0', '-2', '1.2', '1e5', 'abc', '99999999999999999999999']) {
    assert.ok(validation.validateMaxClicks(invalid), `deveria rejeitar ${invalid}`);
  }
});

test('Expiração: seleciona corretamente segundos do contrato da API', () => {
  assert.equal(link.expiryChoiceToSeconds('never'), undefined);
  assert.equal(link.expiryChoiceToSeconds('1d'), 86400);
  assert.equal(link.expiryChoiceToSeconds('7d'), 604800);
  assert.equal(link.expiryChoiceToSeconds('30d'), 2592000);
  assert.equal(link.expiryChoiceToSeconds('custom'), undefined);
});

test('Expiração personalizada: rejeita datas inexistentes e passado', () => {
  assert.ok(validation.validateCustomExpiry('2026-02-31'));
  assert.ok(validation.validateCustomExpiry('2020-01-01'));
  assert.equal(validation.validateCustomExpiry(validation.tomorrowDateString()), null);
});

test('Conquista: criação confirma primeiro link e não duplica conquista', () => {
  globalThis.localStorage.clear();
  assert.deepEqual(achievements.recordLinkCreated(false).map(a => a.id), ['first_link']);
  assert.deepEqual(achievements.recordLinkCreated(false).map(a => a.id), []);
  assert.equal(achievements.getLinkCount(), 2);
});

test('Conquista: terceiro link e expiração são marcados uma única vez', () => {
  globalThis.localStorage.clear();
  achievements.recordLinkCreated(false);
  achievements.recordLinkCreated(false);
  assert.deepEqual(achievements.recordLinkCreated(true).map(a => a.id), ['three_links', 'expiry_set']);
  assert.deepEqual(achievements.recordLinkCreated(true).map(a => a.id), []);
});

test('Conquista: cópia desbloqueada uma só vez', () => {
  globalThis.localStorage.clear();
  assert.deepEqual(achievements.recordLinkCopied().map(a => a.id), ['first_copy']);
  assert.deepEqual(achievements.recordLinkCopied().map(a => a.id), []);
});
