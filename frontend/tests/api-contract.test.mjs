/** Contratos do cliente HTTP com respostas simuladas; não depende da API em execução. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';

const source = (await readFile(resolve(import.meta.dirname, '..', 'src/services/api.ts'), 'utf8'))
  .replaceAll('import.meta.env', '({VITE_API_BASE_URL:""})');
const js = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  fileName: 'api.ts',
}).outputText;
const api = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

const originalFetch = globalThis.fetch;
const example = {
  id: 'id01', code: 'xyz1234', originalUrl: 'https://example.org/artigo',
  clickCount: 0, createdAt: new Date().toISOString(), expiresAt: null,
};

test.after(() => { globalThis.fetch = originalFetch; });

test('POST envia somente o corpo suportado e aceita criação', async () => {
  let received;
  globalThis.fetch = async (url, options) => {
    received = { url, options };
    return new Response(JSON.stringify(example), { status: 201, headers: { 'Content-Type': 'application/json' } });
  };
  assert.equal((await api.createLink({ url: example.originalUrl, expiresIn: 86400 })).code, 'xyz1234');
  assert.equal(received.url, '/api/links');
  assert.equal(received.options.method, 'POST');
  assert.deepEqual(JSON.parse(received.options.body), { url: example.originalUrl, expiresIn: 86400 });
});

test('GET usa somente page até o backend corrigir conversão de limit', async () => {
  let requested;
  globalThis.fetch = async (url) => {
    requested = url;
    return new Response(JSON.stringify({ data: [example], meta: { page: 2, limit: 10, total: 11, totalPages: 2 } }), { status: 200 });
  };
  const links = await api.fetchLinks(2);
  assert.equal(requested, '/api/links?page=2');
  assert.equal(links.data.length, 1);
  assert.equal(links.meta.limit, 10);
});

test('Respostas HTTP inválidas geram ApiError', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Bad request' }), { status: 400 });
  await assert.rejects(api.createLink({ url: example.originalUrl }), (error) => error instanceof api.ApiError && error.status === 400);
});

test('Falha de rede gera NetworkError legível', async () => {
  globalThis.fetch = async () => { throw new TypeError('ECONNREFUSED'); };
  await assert.rejects(api.fetchLinks(), (error) => error instanceof api.NetworkError && /conectar/.test(api.friendlyError(error)));
});
