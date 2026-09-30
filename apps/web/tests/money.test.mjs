import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPoysha, poyshaToTaka, sumPoysha } from '../src/lib/money.ts';

test('poysha converts to taka at 100 to 1', () => {
  assert.equal(poyshaToTaka(7500), 75);
  assert.equal(poyshaToTaka(1), 0.01);
  assert.equal(poyshaToTaka(0), 0);
});

test('every fare renders with the taka sign and two decimals', () => {
  assert.equal(formatPoysha(7500), '৳75.00');
  assert.equal(formatPoysha(6500), '৳65.00');
  assert.equal(formatPoysha(20500), '৳205.00');
  assert.equal(formatPoysha(1), '৳0.01');
  assert.equal(formatPoysha(0), '৳0.00');
});

test('non-finite amounts degrade to a placeholder instead of NaN', () => {
  assert.equal(formatPoysha(Number.NaN), '—');
  assert.equal(formatPoysha(Number.POSITIVE_INFINITY), '—');
});

test('summing fares stays in integer poysha', () => {
  assert.equal(sumPoysha([7500, 6500, 100]), 14100);
  assert.equal(sumPoysha([]), 0);
  assert.ok(Number.isInteger(sumPoysha([333, 333, 334])));
});