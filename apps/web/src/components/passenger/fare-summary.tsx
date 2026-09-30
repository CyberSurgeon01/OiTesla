'use client';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { formatPoysha } from '@/lib/money';
import type { FareQuote } from '@/lib/fare/pricing';

const MUTED = 'text-[#8B93A0]';
const VALUE = 'text-[#F3F4F6]';

function Row({ label, value, className, hint }: {
  label: string;
  value: string;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className={MUTED}>
          {label}
          {hint && <span className="ml-1.5 text-xs text-[#8B93A0]">({hint})</span>}
        </span>
        <span className={`font-medium tabular-nums ${VALUE}`}>{value}</span>
      </div>
    </div>
  );
}

export function FareSummary({ fare, loading, error, onRetry }: {
  fare: FareQuote | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3 py-2" role="status" aria-live="polite">
        <span className="sr-only">Calculating fare</span>
        <div className="h-5 w-32 animate-pulse rounded-md bg-white/10" />
        <div className="h-4 w-full animate-pulse rounded-md bg-white/5" />
        <div className="h-4 w-4/5 animate-pulse rounded-md bg-white/5" />
        <div className="h-4 w-3/5 animate-pulse rounded-md bg-white/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4" role="alert">
        <p className="flex items-start gap-2 text-sm font-medium text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Try again
        </button>
      </div>
    );
  }

  if (!fare) return null;

  return (
    <div>
      <div className="space-y-2.5">
        <Row label="Base fare" value={formatPoysha(fare.baseFare)} />
        <Row label="Distance charge" value={formatPoysha(fare.distanceCharge)} hint={`${fare.distanceKm} km`} />
        <Row
          label="Fare per seat"
          value={formatPoysha(fare.farePerSeat)}
          className="border-b border-[#2C3831] pb-2.5"
        />
        <Row
          label="Seats"
          value={`${fare.seats} × ${formatPoysha(fare.farePerSeat)}`}
        />
        {fare.discount > 0 && fare.discountReason && (
          <Row label={`Discount — ${fare.discountReason}`} value={`− ${formatPoysha(fare.discount)}`} />
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between border-t border-[#2C3831] pt-4">
        <span className="text-base font-bold text-[#F3F4F6]">Total</span>
        <span className="text-xl font-bold tabular-nums text-[#10B981]" data-testid="fare-total">
          {formatPoysha(fare.total)}
        </span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-[#8B93A0]">
        Fares are quoted per seat and the total is confirmed on the server when you book.
      </p>
    </div>
  );
}