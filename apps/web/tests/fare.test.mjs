import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteFare, validateQuoteInput, BASE_FARE_POYSHA, PER_KM_CHARGE_POYSHA } from '../src/lib/fare/pricing.ts';

test('base plus distance makes up the per-seat fare', () => {
  const fare = quoteFare('Banani', 'Gulshan', 1);
  assert.equal(fare.distanceKm, 3);
  assert.equal(fare.baseFare, BASE_FARE_POYSHA);
  assert.equal(fare.distanceCharge, 3 * PER_KM_CHARGE_POYSHA);
  assert.equal(fare.farePerSeat, fare.baseFare + fare.distanceCharge);
});

test('total is fare per seat times seats for 1, 2 and 3 seats', () => {
  for (const seats of [1, 2, 3]) {
    const fare = quoteFare('Banani', 'Gulshan', seats);
    assert.equal(fare.seats, seats);
    assert.equal(fare.total, fare.farePerSeat * seats);
  }
  const one = quoteFare('Banani', 'Gulshan', 1);
  const two = quoteFare('Banani', 'Gulshan', 2);
  const three = quoteFare('Banani', 'Gulshan', 3);
  assert.equal(two.total, one.total * 2);
  assert.equal(three.total, one.total * 3);
});

test('fares stay in integer poysha', () => {
  for (const seats of [1, 2, 3]) {
    const fare = quoteFare('Farmgate', 'Dhanmondi', seats);
    for (const amount of [fare.baseFare, fare.distanceCharge, fare.farePerSeat, fare.total]) {
      assert.ok(Number.isInteger(amount), `${amount} should be an integer`);
    }
  }
});

test('no discount is reported when none is applied', () => {
  const fare = quoteFare('Banani', 'Gulshan', 1);
  assert.equal(fare.discount, 0);
  assert.equal(fare.discountReason, null);
});

test('the quote is deterministic for the same route and seats', () => {
  assert.deepEqual(quoteFare('Gulshan', 'Dhanmondi', 2), quoteFare('Gulshan', 'Dhanmondi', 2));
});

test('unmeasured zone pairs still price through the documented fallback', () => {
  // Mirpur and Uttara have no surveyed distances yet.
  assert.equal(quoteFare('Banani', 'Mirpur', 1).distanceKm, 5);
  assert.ok(quoteFare('Banani', 'Mirpur', 1).total > 0);
});

test('invalid requests are rejected with a message, not a price', () => {
  assert.match(validateQuoteInput('Banani', 'Banani', 1), /different/i);
  assert.match(validateQuoteInput('Nowhere', 'Gulshan', 1), /pickup/i);
  assert.match(validateQuoteInput('Banani', 'Nowhere', 1), /destination/i);
  assert.match(validateQuoteInput('Banani', 'Gulshan', 0), /seats/i);
  assert.match(validateQuoteInput('Banani', 'Gulshan', 4), /seats/i);
  assert.match(validateQuoteInput('Banani', 'Gulshan', 1.5), /seats/i);
  assert.match(validateQuoteInput('Banani', 'Gulshan', '2'), /seats/i);
  assert.equal(validateQuoteInput('Banani', 'Gulshan', 3), null);
});