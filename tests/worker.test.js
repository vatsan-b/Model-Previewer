import test from 'node:test';
import assert from 'node:assert/strict';
import { applySecurityHeaders } from '../src/worker.js';

test('adds restrictive headers without removing the asset response body', async () => {
  const original = new Response('model data', { status: 200, headers: { 'content-type': 'text/plain' } });
  const secured = applySecurityHeaders(original);
  assert.equal(await secured.text(), 'model data');
  assert.equal(secured.headers.get('content-security-policy'), "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  assert.equal(secured.headers.get('x-content-type-options'), 'nosniff');
});
