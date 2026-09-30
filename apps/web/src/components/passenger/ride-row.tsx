'use client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { completeFareBreakdown, statusMetaFor, type CompleteFareBreakdown, type PassengerRide } from '@/lib/ride-status';
import { formatDhakaDateTime, formatDhakaDate } from '@/lib/datetime';
import { formatPoysha } from '@/lib/money';

export function RideStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = statusMetaFor(status);
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
      meta.badge,
      className,
    )}>
      {meta.label}
    </span>
  );
}

export function RideAmount({ ride, className }: { ride: PassengerRide; className?: string }) {
  const meta = statusMetaFor(ride.status);
  return (
    <span className={cn('font-semibold tabular-nums', meta.amount, className)}>
      {formatPoysha(ride.fare_amount)}
    </span>
  );
}

function FareBreakdownLines({ breakdown }: { breakdown: CompleteFareBreakdown }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Base fare', value: formatPoysha(breakdown.baseFare) },
    {
      label: typeof breakdown.distanceKm === 'number'
        ? `Distance charge (${breakdown.distanceKm} km)`
        : 'Distance charge',
      value: formatPoysha(breakdown.distanceCharge),
    },
    { label: 'Fare per seat', value: formatPoysha(breakdown.farePerSeat) },
    { label: 'Seats', value: String(breakdown.seats) },
  ];
  if (breakdown.discount > 0) {
    rows.push({ label: breakdown.discountReason ?? 'Discount', value: `- ${formatPoysha(breakdown.discount)}` });
  }
  return (
    <dl className="mt-3 space-y-1.5 border-t border-[#2C3831] pt-3">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
          <dt className="text-[#8B93A0]">{row.label}</dt>
          <dd className="font-medium tabular-nums text-[#D6DAD3]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The compact ride row used by Recent Rides, the sidebar summary and History, so a ride
 * looks the same everywhere and the status/amount treatment cannot drift per screen.
 * Pass showFareBreakdown on History to expose the stored per-ride breakdown.
 */
export function RideRow({ ride, compact = false, showFareBreakdown = false }: {
  ride: PassengerRide;
  compact?: boolean;
  showFareBreakdown?: boolean;
}) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const timestamp = ride.completed_at ?? ride.cancelled_at ?? ride.requested_at;
  const breakdown = showFareBreakdown ? completeFareBreakdown(ride) : null;
  return (
    <article className="rounded-2xl border border-[#2C3831] bg-[#131815] p-4 transition-colors hover:border-[#10B981]/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#F3F4F6]">
            {ride.pickup_zone} <span aria-hidden="true">&rarr;</span>
            <span className="sr-only"> to </span>
            {ride.destination_zone}
          </p>
          <p className="mt-1 text-xs text-[#8B93A0]">
            <time dateTime={timestamp}>{compact ? formatDhakaDate(timestamp) : formatDhakaDateTime(timestamp)}</time>
            {' · '}
            {ride.seats_requested} seat{ride.seats_requested === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <RideAmount ride={ride} />
          <RideStatusBadge status={ride.status} />
        </div>
      </div>
      {breakdown ? (
        <>
          <button
            type="button"
            onClick={() => setBreakdownOpen((open) => !open)}
            aria-expanded={breakdownOpen}
            className="mt-3 flex w-full items-center justify-between border-t border-[#2C3831] pt-3 text-xs font-medium text-[#A1A1AA] transition-colors hover:text-[#F3F4F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-[#131815]"
          >
            Fare breakdown
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', breakdownOpen && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
          {breakdownOpen && <FareBreakdownLines breakdown={breakdown} />}
        </>
      ) : null}
    </article>
  );
}