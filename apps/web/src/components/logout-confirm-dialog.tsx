'use client';

import { useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-[#131815]';

export function LogoutConfirmDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    cancelButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
        className="w-full max-w-sm rounded-3xl border border-[#2C3831] bg-[#131815] p-6 shadow-2xl sm:p-8"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-300">
          <LogOut className="h-6 w-6" aria-hidden="true" />
        </div>

        <h2 id="logout-dialog-title" className="mt-5 text-center text-2xl font-bold text-[#F3F4F6]">
          Log out?
        </h2>
        <p id="logout-dialog-description" className="mt-2 text-center text-sm leading-6 text-[#A1A1AA]">
          Are you sure you want to log out of OiTesla?
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className={`rounded-xl border border-[#2C3831] bg-[#0A0D0B] px-4 py-3 text-sm font-semibold text-[#F3F4F6] transition-colors hover:bg-[#1E2621] ${FOCUS_RING}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl bg-[#F0FDF4] px-4 py-3 text-sm font-semibold text-[#022C22] transition-colors hover:bg-[#DCFCE7] ${FOCUS_RING}`}
          >
            Yes, log out
          </button>
        </div>
      </div>
    </div>
  );
}
