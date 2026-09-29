import assert from 'node:assert/strict';
import test from 'node:test';
import { readApiResponse } from '../src/lib/api-response.ts';

test('keeps successful login data intact', async () => {
  const session = { token: 'test-token', user: { id: 1, role: 'PASSENGER' } };
  assert.deepEqual(await readApiResponse(Response.json(session)), session);
});

test('preserves credential errors and verification redirects from the API', async () => {
  for (const [status, body] of [
    [401, { error: 'Invalid credentials' }],
    [403, { error: 'Please verify your email first', requiresVerification: true }],
    [500, { error: 'Internal server error' }],
  ]) {
    assert.deepEqual(await readApiResponse(Response.json(body, { status })), body);
  }
});

for (const [label, body, status, contentType] of [
  ['HTML server failure', '<!DOCTYPE html><h1>Server error</h1>', 500, 'text/html'],
  ['plain-text gateway failure', 'Bad Gateway', 502, 'text/plain'],
  ['empty response', '', 200, 'application/json'],
  ['malformed JSON', '{"token":', 200, 'application/json'],
  ['null JSON', 'null', 200, 'application/json'],
  ['JSON string', '"unavailable"', 200, 'application/json'],
  ['JSON array', '[]', 200, 'application/json'],
]) {
  test(`${label} shows a usable error instead of a parser exception`, async () => {
    const response = new Response(body, { status, headers: { 'Content-Type': contentType } });
    await assert.rejects(readApiResponse(response), {
      name: 'Error',
      message: 'The service is temporarily unavailable. Please try again in a moment.',
    });
  });
}

test('rejects a response redirected to a hosting authentication gate', async () => {
  const response = new Response('<html>Log in to continue</html>');
  Object.defineProperty(response, 'redirected', { value: true });
  await assert.rejects(readApiResponse(response), /service is temporarily unavailable/);
});
