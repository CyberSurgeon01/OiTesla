'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ZoneSelectProps = {
  label: string;
  value: string;
  onChange: (zone: string) => void;
  options: string[];
  /** A zone the passenger already picked in the other field; it cannot be selected here. */
  blockedZone?: string;
  placeholder: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

export function ZoneSelect({
  label, value, onChange, options, blockedZone, placeholder, loading = false, error = null, onRetry,
}: ZoneSelectProps) {
  const baseId = useId();
  const buttonId = `${baseId}-button`;
  const listboxId = `${baseId}-listbox`;
  const errorId = `${baseId}-error`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? options.filter((zone) => zone.toLowerCase().includes(needle)) : options;
  }, [options, query]);

  const selectableIndexes = useMemo(
    () => filtered.map((zone, index) => (zone === blockedZone ? -1 : index)).filter((index) => index >= 0),
    [filtered, blockedZone],
  );

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // Keep the highlighted row inside the filtered list as the query narrows.
  useEffect(() => {
    if (!selectableIndexes.length) {
      setActiveIndex(0);
      return;
    }
    if (!selectableIndexes.includes(activeIndex)) setActiveIndex(selectableIndexes[0]);
  }, [selectableIndexes, activeIndex]);

  function openListbox() {
    setOpen(true);
    setQuery('');
  }

  function closeListbox({ restoreFocus = false } = {}) {
    setOpen(false);
    setQuery('');
    if (restoreFocus) buttonRef.current?.focus();
  }

  function commit(zone: string) {
    if (zone === blockedZone) return;
    onChange(zone);
    closeListbox({ restoreFocus: true });
  }

  function move(step: number) {
    if (!selectableIndexes.length) return;
    const position = selectableIndexes.indexOf(activeIndex);
    const next = position === -1
      ? selectableIndexes[0]
      : selectableIndexes[(position + step + selectableIndexes.length) % selectableIndexes.length];
    setActiveIndex(next);
  }

  function handleButtonKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) { openListbox(); } else { move(1); }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) { openListbox(); } else { move(-1); }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (open && selectableIndexes.length) commit(filtered[activeIndex]);
        else openListbox();
        break;
      case 'Escape':
        if (open) { event.preventDefault(); closeListbox({ restoreFocus: true }); }
        break;
      case 'Home':
        if (open && selectableIndexes.length) { event.preventDefault(); setActiveIndex(selectableIndexes[0]); }
        break;
      case 'End':
        if (open && selectableIndexes.length) { event.preventDefault(); setActiveIndex(selectableIndexes[selectableIndexes.length - 1]); }
        break;
      case 'Tab':
        closeListbox();
        break;
    }
  }

  function handleSearchKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); move(1); break;
      case 'ArrowUp': event.preventDefault(); move(-1); break;
      case 'Enter':
        event.preventDefault();
        if (selectableIndexes.length) commit(filtered[activeIndex]);
        break;
      case 'Escape': event.preventDefault(); closeListbox({ restoreFocus: true }); break;
    }
  }

  const isBlocked = Boolean(blockedZone && blockedZone === value);

  return (
    <div className="relative" ref={containerRef}>
      <label htmlFor={buttonId} className="mb-1 ml-1 block text-xs font-semibold text-[#F3F4F6]">
        {label}
      </label>

      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-activedescendant={open && selectableIndexes.length ? `${baseId}-option-${activeIndex}` : undefined}
        aria-invalid={Boolean(error) || isBlocked}
        aria-describedby={error ? errorId : undefined}
        disabled={loading}
        onClick={() => (open ? closeListbox() : openListbox())}
        onKeyDown={handleButtonKeyDown}
        className={cn(
          'flex w-full items-center gap-2 rounded-xl border bg-[#1E2621] p-3.5 text-left text-sm font-semibold transition-colors',
          'hover:bg-[#1A211D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-[#131815]',
          error || isBlocked ? 'border-red-500/60' : 'border-[#2C3831]',
          loading && 'cursor-not-allowed opacity-60',
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#10B981]" aria-hidden="true" /> : null}
        <span className={cn('flex-1 truncate', value ? 'text-[#F3F4F6]' : 'text-[#8B93A0]')}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-[#8B93A0] transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {error && (
        <p id={errorId} className="mt-1.5 ml-1 flex items-start gap-1.5 text-xs font-medium text-red-300">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 font-semibold text-red-200 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" /> Retry
            </button>
          )}
        </p>
      )}

      {open && !loading && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-50 overflow-hidden rounded-xl border border-[#2C3831] bg-[#0A0D0B] shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
          <div className="flex items-center border-b border-[#2C3831] p-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-[#8B93A0]" aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search zone"
              aria-label={`Search ${label.toLowerCase()}`}
              aria-controls={listboxId}
              aria-autocomplete="list"
              className="w-full bg-transparent text-sm text-[#F3F4F6] outline-none placeholder:text-[#8B93A0]"
            />
          </div>

          <ul
            id={listboxId}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            className="max-h-56 overflow-y-auto overscroll-contain p-2"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-center text-sm text-[#8B93A0]">No zones match “{query}”</li>
            ) : (
              filtered.map((zone, index) => {
                const blocked = zone === blockedZone;
                const selected = zone === value;
                return (
                  <li
                    key={zone}
                    id={`${baseId}-option-${index}`}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={blocked}
                    onClick={() => commit(zone)}
                    onMouseEnter={() => !blocked && setActiveIndex(index)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-lg px-4 py-3 text-sm transition-colors',
                      blocked && 'cursor-not-allowed text-[#6B7A72]',
                      !blocked && index === activeIndex && 'bg-[#1E2621] text-[#F3F4F6]',
                      !blocked && index !== activeIndex && 'text-[#C8CFD4]',
                    )}
                  >
                    <span>{zone}</span>
                    {blocked ? (
                      <span className="text-[10px] uppercase tracking-wide text-[#6B7A72]">already chosen</span>
                    ) : selected ? (
                      <Check className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}