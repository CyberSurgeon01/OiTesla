import { cn } from '@/lib/utils';
import { MAX_RATING } from '@/lib/rating';

const SIZES = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-2xl',
} as const;

const GLYPH_SIZES = {
  sm: 'text-xs',
  md: 'text-base',
  lg: 'text-4xl',
} as const;

/**
 * Read-only star row for a single ride's rating. Renders nothing when the ride has not been
 * rated, so callers can drop it in unconditionally without guarding on null themselves.
 *
 * The filled/outline pair is hidden from assistive tech and replaced by one label, because
 * five separate glyphs read as noise rather than as "4 out of 5".
 */
export function RatingStars({
  rating,
  size = 'sm',
  className,
  label,
}: {
  rating?: number | null;
  size?: keyof typeof SIZES;
  className?: string;
  label?: string;
}) {
  if (typeof rating !== 'number') return null;
  const filled = Math.min(Math.max(Math.round(rating), 0), MAX_RATING);
  const text = label ?? `${filled} out of ${MAX_RATING} stars`;

  return (
    <span
      className={cn('inline-flex items-center gap-0.5 leading-none text-yellow-400', SIZES[size], className)}
      role="img"
      aria-label={text}
      title={text}
    >
      <span aria-hidden="true" className={GLYPH_SIZES[size]}>
        {Array.from({ length: MAX_RATING }, (_, index) => (index < filled ? '\u2605' : '\u2606')).join('')}
      </span>
    </span>
  );
}

/**
 * A dashboard-level summary: the mean score next to how many rides it is based on. An
 * average with no sample size is misleading, so the count is always shown.
 */
export function RatingAverage({
  average,
  count,
  className,
}: {
  average: number | null;
  count: number;
  className?: string;
}) {
  if (average === null || count === 0) {
    return <span className={cn('text-sm text-[#8B93A0]', className)}>No ratings yet</span>;
  }
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <RatingStars rating={average} size="md" label={`Average rating ${average} out of ${MAX_RATING} stars`} />
      <span className="text-sm font-semibold tabular-nums text-white">{average.toFixed(1)}</span>
      <span className="text-xs text-[#A1A1AA]">
        {count} rating{count === 1 ? '' : 's'}
      </span>
    </span>
  );
}
