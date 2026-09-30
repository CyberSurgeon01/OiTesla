'use client';
import { cn } from '@/lib/utils';
import { MAX_SEATS_PER_RIDE } from '@/lib/ride-status';

const OPTIONS = Array.from({ length: MAX_SEATS_PER_RIDE }, (_, index) => index + 1);

/**
 * Native radio inputs styled with Tailwind `peer-*` variants. Using real radios keeps
 * browser keyboard behaviour for free: arrow keys move and select within the group, and
 * only the checked input is in the tab order.
 */
export function SeatSelector({ name, value, onChange, describedBy }: {
  name: string;
  value: number;
  onChange: (seats: number) => void;
  describedBy?: string;
}) {
  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="mb-3 ml-1 text-sm font-semibold text-[#F3F4F6]">Seats</legend>
      <div className="flex gap-3">
        {OPTIONS.map((seats) => (
          <label key={seats} className="flex-1 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={seats}
              checked={value === seats}
              onChange={() => onChange(seats)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                'flex items-center justify-center rounded-xl border py-3 text-base font-bold transition-all',
                'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#10B981] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#131815]',
                value === seats
                  ? 'border-[#10B981] bg-[#10B981] text-[#022C22] shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'border-[#2C3831] bg-[#0A0D0B] text-[#F3F4F6] hover:border-[#10B981]/50',
              )}
            >
              {seats}
            </span>
            <span className="sr-only">{seats} seat{seats === 1 ? '' : 's'}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}