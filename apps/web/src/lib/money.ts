const POYSHA_PER_TAKA = 100;

const takaFormatter = new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Money is stored and computed in poysha (integer minor units) so that fares can
 * never drift through repeated floating point arithmetic. Convert to taka only
 * for display.
 */
export function poyshaToTaka(poysha: number): number {
  return Math.round(poysha) / POYSHA_PER_TAKA;
}

/** The single currency formatter used everywhere a fare is rendered. */
export function formatPoysha(poysha: number): string {
  if (!Number.isFinite(poysha)) return '—';
  return takaFormatter.format(poyshaToTaka(poysha));
}

/** Sum poysha values without leaving integer minor units. */
export function sumPoysha(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}