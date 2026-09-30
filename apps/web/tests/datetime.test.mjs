import test from 'node:test';
import assert from 'node:assert/strict';
import {
  startOfDhakaDay, startOfDhakaMonth, formatDhakaDateTime, formatDhakaDate, toDate,
} from '../src/lib/datetime.ts';

test('day boundaries follow Dhaka, not the server timezone', () => {
  // 23:30 UTC on 30 Sep is already 05:30 on 1 Oct in Dhaka (UTC+6).
  const lateUtc = new Date('2026-09-30T23:30:00Z');
  assert.equal(startOfDhakaDay(lateUtc).toISOString(), '2026-09-30T18:00:00.000Z');
  assert.equal(formatDhakaDate(startOfDhakaDay(lateUtc)), '1 Oct 2026');

  // 18:00 UTC on 30 Sep is exactly midnight in Dhaka.
  assert.equal(formatDhakaDate(startOfDhakaDay(new Date('2026-09-30T18:00:00Z'))), '1 Oct 2026');
  // One millisecond earlier is still 30 Sep in Dhaka.
  assert.equal(formatDhakaDate(startOfDhakaDay(new Date('2026-09-30T17:59:59.999Z'))), '30 Sep 2026');
});

test('month boundaries follow Dhaka', () => {
  // Mid-month: 1 Sep 00:00 Dhaka is 31 Aug 18:00 UTC.
  assert.equal(startOfDhakaMonth(new Date('2026-09-15T06:00:00Z')).toISOString(), '2026-08-31T18:00:00.000Z');
  // 23:30 UTC on 30 Sep is already 1 Oct in Dhaka, so the month rolls over.
  assert.equal(startOfDhakaMonth(new Date('2026-09-30T23:30:00Z')).toISOString(), '2026-09-30T18:00:00.000Z');
});

test('day start is never after the moment it describes', () => {
  for (const iso of ['2026-01-01T00:00:00Z', '2026-06-15T05:00:00Z', '2026-12-31T19:00:00Z', '2026-03-08T07:30:00Z']) {
    const now = new Date(iso);
    assert.ok(startOfDhakaDay(now) <= now);
    assert.ok(startOfDhakaMonth(now) <= now);
  }
});

test('timestamps render unambiguously in 12-hour Dhaka time', () => {
  assert.equal(formatDhakaDateTime('2026-09-30T12:12:00Z'), '30 Sep 2026, 6:12 PM');
  assert.equal(formatDhakaDateTime('2026-09-30T06:12:00Z'), '30 Sep 2026, 12:12 PM');
  assert.equal(formatDhakaDateTime('2026-09-30T00:05:00Z'), '30 Sep 2026, 6:05 AM');
  assert.equal(formatDhakaDateTime('2026-09-29T18:30:00Z'), '30 Sep 2026, 12:30 AM');
  // UTC evening stays on the same Dhaka date.
  assert.equal(formatDhakaDateTime('2026-01-05T16:00:00Z'), '5 Jan 2026, 10:00 PM');
  // UTC after 18:00 has already rolled into the next Dhaka day.
  assert.equal(formatDhakaDateTime('2026-01-05T19:00:00Z'), '6 Jan 2026, 1:00 AM');
});

test('dates never render as US month/day ordering', () => {
  const rendered = formatDhakaDateTime('2026-09-30T12:12:00Z');
  assert.ok(rendered.startsWith('30 Sep 2026'));
  assert.ok(!/^9\/30\//.test(rendered));
});

test('missing or invalid timestamps degrade to a placeholder', () => {
  assert.equal(formatDhakaDateTime(null), '—');
  assert.equal(formatDhakaDateTime('not-a-date'), '—');
  assert.equal(formatDhakaDate(undefined), '—');
  assert.equal(toDate('nope'), null);
});