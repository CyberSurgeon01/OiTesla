'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Loader2, RefreshCw } from 'lucide-react';

import { readApiResponse } from '@/lib/api-response';
import type { PassengerRide } from '@/lib/ride-status';
import { RideRow } from '@/components/passenger/ride-row';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0D0B]';

export default function PassengerHistory() {
  const [history, setHistory] = useState<PassengerRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      const token = localStorage.getItem('token');
      if (!token) {
        router.replace('/login');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/passenger/rides/history', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.replace('/login');
          return;
        }
        const data = await readApiResponse(res, { allowArray: res.ok });
        if (!res.ok) throw new Error(data.error || 'Could not load your ride history.');
        if (!cancelled) setHistory(Array.isArray(data) ? (data as PassengerRide[]) : []);
      } catch (cause) {
        if (!cancelled) setError((cause as Error).message || 'Could not load your ride history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHistory();
    return () => { cancelled = true; };
  }, [router, reloadKey]);

  return (
    <div className="min-h-screen bg-[#0A0D0B] font-sans text-[#F3F4F6] selection:bg-[#10B981]/30">
      <a
        href="#history-list"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-lg focus:bg-[#10B981] focus:px-4 focus:py-2 focus:font-semibold focus:text-[#022C22]"
      >
        Skip to ride list
      </a>

      <header className="sticky top-0 z-40 w-full border-b border-[#2C3831] bg-[#0A0D0B]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-lg items-center gap-4 px-4 sm:px-6">
          <Link
            href="/passenger/dashboard"
            aria-label="Back to dashboard"
            className={`-ml-2 rounded-full p-2 text-[#A1A1AA] transition-colors hover:bg-[#131815] hover:text-[#F3F4F6] ${FOCUS_RING}`}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <span className="text-lg font-bold tracking-tight">Trip history</span>
        </div>
      </header>

      <main id="history-list" className="mx-auto w-full max-w-lg space-y-4 px-4 py-8 sm:px-6">
        {loading ? (
          <div className="flex justify-center py-20" role="status">
            <Loader2 className="h-8 w-8 animate-spin text-[#10B981]" aria-hidden="true" />
            <span className="sr-only">Loading your ride history</span>
          </div>
        ) : error ? (
          <div className="space-y-4 rounded-2xl border border-red-500/40 bg-red-500/5 p-8 text-center" role="alert">
            <p className="text-sm font-medium text-red-200">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className={`inline-flex items-center gap-2 rounded-xl border border-[#2C3831] bg-[#131815] px-4 py-2.5 text-sm font-semibold text-[#F3F4F6] transition-colors hover:border-[#10B981]/60 ${FOCUS_RING}`}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#3F4A44] bg-[#131815] p-12 text-center">
            <Clock className="mx-auto mb-3 h-8 w-8 text-[#8B93A0]" aria-hidden="true" />
            <p className="text-base font-semibold text-[#F3F4F6]">No trips yet</p>
            <p className="mx-auto mt-2 max-w-xs text-sm text-[#8B93A0]">
              Completed and cancelled rides will be listed here once you have taken a trip.
            </p>
            <Link
              href="/passenger/dashboard"
              className={`mt-6 inline-flex items-center rounded-xl bg-[#F0FDF4] px-5 py-2.5 text-sm font-semibold text-[#022C22] transition-colors hover:bg-[#DCFCE7] ${FOCUS_RING}`}
            >
              Book your first ride
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {history.map((ride) => (
              <li key={ride.id}><RideRow ride={ride} showFareBreakdown /></li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}