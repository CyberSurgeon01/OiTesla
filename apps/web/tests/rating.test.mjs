import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_RATING,
  MAX_RATING_COMMENT_LENGTH,
  averageRating,
  parseRatingComment,
  parseRatingValue,
} from '../src/lib/rating.ts';

test('only whole stars in range are accepted', () => {
  for (const value of [1, 2, 3, 4, MAX_RATING]) {
    assert.equal(parseRatingValue(value), value);
  }
  for (const value of [0, -1, 6, 1.5, 4.999, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(parseRatingValue(value), null);
  }
});

test('non-numeric ratings are rejected rather than coerced', () => {
  for (const value of ['5', null, undefined, true, [], {}, [5]]) {
    assert.equal(parseRatingValue(value), null);
  }
});

test('a missing comment and a blank comment are the same stored value', () => {
  assert.deepEqual(parseRatingComment(undefined), { ok: true, value: null });
  assert.deepEqual(parseRatingComment(null), { ok: true, value: null });
  assert.deepEqual(parseRatingComment(''), { ok: true, value: null });
  assert.deepEqual(parseRatingComment('   \n\t '), { ok: true, value: null });
});

test('comments are trimmed, and only text of a bounded length is kept', () => {
  assert.deepEqual(parseRatingComment('  Great ride!  '), { ok: true, value: 'Great ride!' });
  assert.deepEqual(parseRatingComment('x'.repeat(MAX_RATING_COMMENT_LENGTH)), {
    ok: true,
    value: 'x'.repeat(MAX_RATING_COMMENT_LENGTH),
  });
  assert.deepEqual(parseRatingComment('x'.repeat(MAX_RATING_COMMENT_LENGTH + 1)), { ok: false });
  for (const value of [{}, [], 42, true]) {
    assert.deepEqual(parseRatingComment(value), { ok: false });
  }
});

test('an average is null until at least one ride is rated', () => {
  assert.equal(averageRating([]), null);
  assert.equal(averageRating([null, undefined]), null);
});

test('an average rounds to one decimal and ignores unrated rides', () => {
  assert.equal(averageRating([5]), 5);
  assert.equal(averageRating([4, 5]), 4.5);
  assert.equal(averageRating([5, 4, 3]), 4);
  assert.equal(averageRating([5, 4, 3, 4]), 4);
  assert.equal(averageRating([5, 1, null, 4, undefined]), 3.3);
});
