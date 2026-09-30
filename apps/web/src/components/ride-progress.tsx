import { cn } from '@/lib/utils';

const STEPS = [
  { status: 'REQUESTED', label: 'Requested' },
  { status: 'ACCEPTED', label: 'Accepted' },
  { status: 'DRIVER_ARRIVED', label: 'Arrived' },
  { status: 'STARTED', label: 'Started' },
  { status: 'COMPLETED', label: 'Completed' },
] as const;

export function RideProgress({ status, className }: { status: string; className?: string }) {
  const currentIndex = Math.max(0, STEPS.findIndex((step) => step.status === status));

  return (
    <div className={cn('relative w-full py-2', className)}>
      <div aria-hidden="true" className="absolute left-[10%] right-[10%] top-[18px] h-0.5 bg-[#2C3831]" />
      <div
        aria-hidden="true"
        className="absolute left-[10%] top-[18px] h-0.5 bg-[#10B981] transition-all duration-500"
        style={{ width: `${currentIndex * 20}%` }}
      />
      <ol className="relative grid grid-cols-5" aria-label="Ride progress">
        {STEPS.map((step, index) => {
          const current = index === currentIndex;
          const reached = index <= currentIndex;
          return (
            <li key={step.status} aria-current={current ? 'step' : undefined} className="flex min-w-0 flex-col items-center text-center">
              <span
                aria-hidden="true"
                className={cn(
                  'relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                  reached ? 'border-[#10B981] bg-[#10B981]' : 'border-[#3F4A44] bg-[#131815]',
                  current && 'shadow-[0_0_12px_rgba(16,185,129,0.7)]',
                )}
              >
                {reached && <span className={cn('h-2 w-2 rounded-full', current ? 'bg-[#022C22]' : 'bg-white')} />}
              </span>
              <span className={cn(
                'mt-3 w-full min-w-0 break-words px-0.5 text-[9px] font-bold uppercase leading-tight sm:text-[10px]',
                current ? 'text-[#10B981]' : reached ? 'text-[#F3F4F6]' : 'text-[#8B93A0]',
              )}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="sr-only">Step {currentIndex + 1} of {STEPS.length}: {STEPS[currentIndex].label}</p>
    </div>
  );
}
