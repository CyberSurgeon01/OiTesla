import test from 'node:test';
import assert from 'node:assert/strict';
import { statusMetaFor, RIDE_STATUS_META, MAX_SEATS_PER_RIDE, completeFareBreakdown } from '../src/lib/ride-status.ts';

test('completed rides read as green and cancelled rides are muted', () => {
  assert.match(RIDE_STATUS_META.COMPLETED.badge, /emerald/);
  assert.match(RIDE_STATUS_META.CANCELLED.amount, /line-through/);
  assert.match(RIDE_STATUS_META.CANCELLED.badge, /line-through/);
  assert.equal(RIDE_STATUS_META.COMPLETED.label, 'Completed');
  assert.equal(RIDE_STATUS_META.CANCELLED.label, 'Cancelled');
});

test('every in-flight status reads as an amber ongoing state', () => {
  for (const status of ['REQUESTED', 'MATCHED', 'ACCEPTED', 'DRIVER_ARRIVED', 'STARTED']) {
    const meta = statusMetaFor(status);
    assert.match(meta.badge, /amber/, `${status} should be amber`);
    assert.notEqual(meta.label, 'Completed');
  }
});

test('completed and cancelled never share styling', () => {
  assert.notEqual(RIDE_STATUS_META.COMPLETED.amount, RIDE_STATUS_META.CANCELLED.amount);
  assert.notEqual(RIDE_STATUS_META.COMPLETED.badge, RIDE_STATUS_META.CANCELLED.badge);
});

test('unknown statuses fall back instead of throwing', () => {
  assert.equal(statusMetaFor('TELEPORTED').label, 'Unknown');
  assert.equal(statusMetaFor(null).label, 'Unknown');
  assert.equal(statusMetaFor(undefined).label, 'Unknown');
});

test('seat limit matches the seat selector options', () => {
  assert.equal(MAX_SEATS_PER_RIDE, 3);
});

const fullSnapshot = {
  distanceKm: 3,
  baseFare: 3000,
  distanceCharge: 4500,
  farePerSeat: 7500,
  seats: 2,
  discount: 0,
  discountReason: null,
  total: 15000,
};

test('a fully priced ride exposes its breakdown', () => {
  const ride = { fare_amount: 15000, fare_breakdown: fullSnapshot };
  assert.deepEqual(completeFareBreakdown(ride), fullSnapshot);
});

test('a backfilled pre-snapshot ride shows a total, not a fake breakdown', () => {
  // Exactly what the migration writes for rows priced by the legacy API: total and seats
  // are known, every component is NULL and must not be reconstructed.
  const backfilled = {
    distanceKm: null,
    baseFare: null,
    distanceCharge: null,
    farePerSeat: null,
    seats: 2,
    discount: 0,
    discountReason: null,
    total: 13000,
  };
  assert.equal(completeFareBreakdown({ fare_amount: 13000, fare_breakdown: backfilled }), null);
});

test('a missing or null breakdown is handled without throwing', () => {
  assert.equal(completeFareBreakdown({ fare_amount: 0 }), null);
  assert.equal(completeFareBreakdown({ fare_amount: 0, fare_breakdown: null }), null);
});