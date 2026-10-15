import test from 'node:test';
import assert from 'node:assert/strict';
import { qrModules } from '../src/utils/qrCode.js';

test('QR Code: gera uma matriz quadrada para um link curto', () => {
  const cells = qrModules('https://enc.lk/abc1234');
  assert.ok(cells.length >= 21);
  assert.ok(cells.every((row) => row.length === cells.length));
  assert.equal(cells[0][0], true);
  assert.ok(cells.flat().some((cell) => cell === false));
});
