export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const MAX_RATING_COMMENT_LENGTH = 2000;

/**
 * A rating is only renderable as a star count when it is a whole number of stars in range.
 * Returns null for anything else so a caller must handle "no rating" explicitly instead of
 * accidentally trusting a fractional, zero, negative or out-of-range value from the body.
 */
export function parseRatingValue(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < MIN_RATING || value > MAX_RATING) return null;
  return value;
}

/**
 * Rating comments are optional. A missing field, an explicit null and a whitespace-only
 * string all mean "no comment" and are stored as NULL, so a cleared textarea is
 * indistinguishable from one that was never touched.
 */
export function parseRatingComment(
  value: unknown,
): { ok: true; value: string | null } | { ok: false } {
  if (value == null) return { ok: true, value: null };
  if (typeof value !== 'string' || value.length > MAX_RATING_COMMENT_LENGTH) return { ok: false };
  return { ok: true, value: value.trim() || null };
}

/** Mean of a set of ratings, rounded to one decimal, or null when nothing has been rated. */
export function averageRating(ratings: Array<number | null | undefined>): number | null {
  const scored = ratings.filter((value): value is number => typeof value === 'number');
  if (scored.length === 0) return null;
  const total = scored.reduce((sum, value) => sum + value, 0);
  return Math.round((total / scored.length) * 10) / 10;
}
