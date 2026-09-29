import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getJwtSecret } from '../src/lib/server-config.ts';

const script = fileURLToPath(new URL('../scripts/check-env.cjs', import.meta.url));
const validEnv = { ...process.env, VERCEL: '1', DATABASE_URL: 'postgresql://test:test@localhost/oitesla', JWT_SECRET: 'test-only-secret' };

test('Vercel build rejects empty database and signing-secret settings', () => {
  for (const name of ['DATABASE_URL', 'JWT_SECRET']) {
    const result = spawnSync(process.execPath, [script], { env: { ...validEnv, [name]: ' ' }, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes(name));
  }
});

test('malformed database URLs fail without echoing credentials', () => {
  const result = spawnSync(process.execPath, [script], {
    env: { ...validEnv, DATABASE_URL: 'postgresql://private-password@bad host/db' }, encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.ok(!result.stderr.includes('private-password'));
});

test('valid deployment configuration passes', () => {
  assert.equal(spawnSync(process.execPath, [script], { env: validEnv }).status, 0);
});

test('production authentication never falls back to a default signing key', () => {
  const before = { NODE_ENV: process.env.NODE_ENV, JWT_SECRET: process.env.JWT_SECRET };
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    assert.throws(() => getJwtSecret(), /JWT_SECRET/);
    process.env.JWT_SECRET = 'test-only-secret';
    assert.equal(getJwtSecret(), 'test-only-secret');
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
