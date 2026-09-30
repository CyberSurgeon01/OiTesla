'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle, ArrowRight, ArrowRightLeft, Car, Clock, Loader2, LogOut, Menu, Navigation, Search, X,
} from 'lucide-react';

import { displayName, readStoredUser, type StoredUser } from '@/lib/session';
import { readApiResponse } from '@/lib/api-response';
import { formatPoysha } from '@/lib/money';
import { startOfDhakaDay } from '@/lib/datetime';
import type { FareQuote } from '@/lib/fare/pricing';
import type { PassengerRide } from '@/lib/ride-status';
import { useToast } from '@/hooks/use-toast';
import { FareSummary } from '@/components/passenger/fare-summary';
import { RideProgress } from '@/components/ride-progress';
import { RideAmount, RideRow, RideStatusBadge } from '@/components/passenger/ride-row';
import { SeatSelector } from '@/components/passenger/seat-selector';
import { ZoneSelect } from '@/components/passenger/zone-select';
import { RatingAverage } from '@/components/rating-stars';
import { RatingDialog } from '@/components/rating-dialog';
import { LogoutConfirmDialog } from '@/components/logout-confirm-dialog';

const BOOKING_STORAGE_KEY = 'oitesla:passenger:booking';
const RECENT_RIDE_LIMIT = 3;
const ACTIVE_RIDE_POLL_MS = 2000;
const FARE_DEBOUNCE_MS = 250;

type StoredBooking = { pickup: string; destination: string; seats: number };

type RideStats = {
  spentToday: number;
  spentThisMonth: number;
  averageRating: number | null;
  ratingCount: number;
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0D0B]';

function readStoredBooking(): Partial<StoredBooking> {
  try {
    const parsed = JSON.parse(localStorage.getItem(BOOKING_STORAGE_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export default function PassengerDashboard() {
  const router = useRouter();
  const { toast } = useToast();

  const [user, setUser] = useState<StoredUser | null>(null);
  const [ready, setReady] = useState(false);

  const [zones, setZones] = useState<string[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zonesError, setZonesError] = useState<string | null>(null);

  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [seats, setSeats] = useState(1);

  const [fare, setFare] = useState<FareQuote | null>(null);
  const [fareLoading, setFareLoading] = useState(false);
  const [fareError, setFareError] = useState<string | null>(null);
  const [quotedSelection, setQuotedSelection] = useState('');
  const selection = JSON.stringify([pickup, destination, seats]);
  const fareIsCurrent = quotedSelection === selection;
  const fareController = useRef<AbortController | null>(null);

  const [requesting, setRequesting] = useState(false);
  const bookingInFlight = useRef(false);

  const [activeRide, setActiveRide] = useState<PassengerRide | null>(null);
  const [completedRide, setCompletedRide] = useState<PassengerRide | null>(null);
  const [activeLoading, setActiveLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const [history, setHistory] = useState<PassengerRide[]>([]);
  const [stats, setStats] = useState<RideStats>({
    spentToday: 0,
    spentThisMonth: 0,
    averageRating: null,
    ratingCount: 0,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [ratingRide, setRatingRide] = useState<PassengerRide | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  const previousStatus = useRef<string | null>(null);
  const activeRideRef = useRef<PassengerRide | null>(null);
  const pollInFlight = useRef(false);
  const rideVersion = useRef(0);
  const tokenRef = useRef<string | null>(null);

  const sameZone = Boolean(pickup && destination && pickup === destination);

  /* ---------------------------------------------------------------- session */

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = readStoredUser();
    if (!token || !storedUser) {
      router.replace('/login');
      return;
    }
    if (storedUser.role !== 'PASSENGER') {
      router.replace('/driver/dashboard');
      return;
    }
    tokenRef.current = token;
    setUser(storedUser);

    const remembered = readStoredBooking();
    if (typeof remembered.pickup === 'string') setPickup(remembered.pickup);
    if (typeof remembered.destination === 'string') setDestination(remembered.destination);
    if (Number.isInteger(remembered.seats) && (remembered.seats as number) >= 1 && (remembered.seats as number) <= 3) {
      setSeats(remembered.seats as number);
    }
    setReady(true);
  }, [router]);

  const signOut = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(BOOKING_STORAGE_KEY);
    router.replace('/login');
  }, [router]);

  const closeLogoutConfirm = useCallback(() => setShowLogoutConfirm(false), []);

  const signInExpired = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.replace('/login');
  }, [router]);

  /* ------------------------------------------------------------------ zones */

  const loadZones = useCallback(async (signal?: AbortSignal) => {
    setZonesLoading(true);
    setZonesError(null);
    try {
      const res = await fetch('/api/rides/zones', {
        headers: { Authorization: `Bearer ${tokenRef.current ?? ''}` },
        signal,
      });
      if (res.status === 401 || res.status === 403) { signInExpired(); return; }
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Unable to load zones.');
      if (!Array.isArray(data.zones) || data.zones.length === 0) {
        throw new Error('No serviceable zones are available right now.');
      }
      setZones(data.zones as string[]);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      setZones([]);
      setZonesError((error as Error).message || 'Unable to load zones.');
    } finally {
      if (!signal?.aborted) setZonesLoading(false);
    }
  }, [signInExpired]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    loadZones(controller.signal);
    return () => controller.abort();
  }, [ready, loadZones]);

  // Seed sensible defaults once zones arrive, and never leave pickup === destination.
  useEffect(() => {
    if (!zones.length) return;
    setPickup((current) => (zones.includes(current) ? current : zones[0]));
    setDestination((current) =>
      zones.includes(current) && current !== zones[0] ? current : zones.find((zone) => zone !== zones[0]) ?? zones[0],
    );
  }, [zones]);

  // Remember the last booking so the form reopens where the passenger left off.
  useEffect(() => {
    if (!ready || !pickup || !destination) return;
    localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify({ pickup, destination, seats }));
  }, [ready, pickup, destination, seats]);

  /* ------------------------------------------------------------------- fare */

  const refreshFare = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    fareController.current?.abort();
    const controller = new AbortController();
    fareController.current = controller;
    setFareLoading(true);
    setFareError(null);
    try {
      const query = new URLSearchParams({ pickup, destination, seats: String(seats) });
      const res = await fetch(`/api/rides/estimate?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Unable to calculate the fare.');
      if (controller.signal.aborted) return;
      setFare(data.fare as FareQuote);
      setQuotedSelection(JSON.stringify([pickup, destination, seats]));
    } catch (error) {
      if (controller.signal.aborted) return;
      setFare(null);
      setFareError((error as Error).message || 'Unable to calculate the fare.');
    } finally {
      if (!controller.signal.aborted) setFareLoading(false);
    }
  }, [pickup, destination, seats]);

  useEffect(() => {
    if (!ready || zonesLoading || !pickup || !destination) return;
    if (pickup === destination) {
      setFare(null);
      setFareError(null);
      setFareLoading(false);
      return;
    }
    setFareError(null);
    setFareLoading(true);
    const timer = setTimeout(() => { refreshFare(); }, FARE_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      fareController.current?.abort();
    };
  }, [ready, zonesLoading, pickup, destination, seats, refreshFare]);

  /* -------------------------------------------------------------- ride data */

  const loadHistory = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return null;
    try {
      const res = await fetch('/api/passenger/rides/history', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401 || res.status === 403) { signInExpired(); return null; }
      if (res.ok) {
        const data = await readApiResponse(res, { allowArray: true });
        if (Array.isArray(data)) {
          setHistory(data as PassengerRide[]);
          return data as PassengerRide[];
        }
      }
    } catch {
      // The dashboard stays usable; the empty state covers a failed history read.
    }
    return null;
  }, [signInExpired]);

  const loadStats = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const res = await fetch('/api/passenger/stats', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401 || res.status === 403) { signInExpired(); return; }
      if (res.ok) {
        const data = await readApiResponse(res);
        if (typeof data.spentToday === 'number' && typeof data.spentThisMonth === 'number') {
          setStats({
            spentToday: data.spentToday,
            spentThisMonth: data.spentThisMonth,
            averageRating: typeof data.averageRating === 'number' ? data.averageRating : null,
            ratingCount: typeof data.ratingCount === 'number' ? data.ratingCount : 0,
          });
        }
      }
    } catch {
      // Non-fatal: the cards simply stay at zero.
    }
  }, [signInExpired]);

  const maybePromptForRating = useCallback(async () => {
    const token = tokenRef.current;
    if (!token || activeRideRef.current) return;
    try {
      const res = await fetch('/api/passenger/rides/history', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await readApiResponse(res, { allowArray: true });
      const unrated = Array.isArray(data)
        ? (data as PassengerRide[]).find((ride) => ride.status === 'COMPLETED' && !ride.rating)
        : undefined;
      if (unrated) {
        setCompletedRide(unrated);
        setRatingRide(unrated);
      }
    } catch {
      // A missed rating prompt is not worth surfacing as an error.
    }
  }, []);

  const fetchActiveRide = useCallback(async () => {
    const token = tokenRef.current;
    if (!token || pollInFlight.current) return;
    pollInFlight.current = true;
    const version = rideVersion.current;
    try {
      const res = await fetch('/api/passenger/rides/active', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401 || res.status === 403) { signInExpired(); return; }
      if (!res.ok) return;

      const data = await readApiResponse(res, { allowNull: true });
      if (version !== rideVersion.current) return;
      const ride = (data ?? null) as PassengerRide | null;
      const status = ride?.status ?? null;
      const previousRide = activeRideRef.current;

      if (!ride && previousRide) {
        const latestHistory = await loadHistory();
        if (!latestHistory || version !== rideVersion.current) return; // Retry without overwriting a newer action.
        const finishedRide = latestHistory.find((item) => item.id === previousRide.id);
        if (finishedRide?.status === 'COMPLETED') {
          setCompletedRide(finishedRide);
          toast({ title: 'Trip completed', description: 'You have arrived at your destination.' });
          if (!finishedRide.rating) {
            setRatingRide(finishedRide);
          }
        } else {
          toast({ title: 'Ride closed', description: 'Your ride is no longer active.' });
        }
        loadStats();
      } else if (ride && previousStatus.current && previousStatus.current !== status) {
        if (status === 'ACCEPTED') toast({ title: 'Ride accepted', description: 'A driver is on the way to your pickup.' });
        else if (status === 'DRIVER_ARRIVED') toast({ title: 'Driver arrived', description: 'Please meet your driver at the pickup point.' });
        else if (status === 'STARTED') toast({ title: 'Trip started', description: 'You are on your way.' });
      }

      activeRideRef.current = ride;
      previousStatus.current = status;
      setActiveRide(ride);
    } catch {
      // A dropped poll is retried on the next tick.
    } finally {
      pollInFlight.current = false;
      setActiveLoading(false);
    }
  }, [signInExpired, toast, loadHistory, loadStats]);

  useEffect(() => {
    if (!ready) return;
    void (async () => {
      await fetchActiveRide();
      loadHistory();
      loadStats();
      maybePromptForRating();
    })();

    const interval = setInterval(fetchActiveRide, ACTIVE_RIDE_POLL_MS);
    return () => clearInterval(interval);
  }, [ready, loadHistory, loadStats, fetchActiveRide, maybePromptForRating]);

  /* ---------------------------------------------------------------- actions */

  function swapZones() {
    setPickup(destination);
    setDestination(pickup);
  }

  const requestRide = async () => {
    if (bookingInFlight.current || sameZone || !fare || !fareIsCurrent || fareLoading) return;
    // Guards against a second click landing before React re-renders the disabled button.
    bookingInFlight.current = true;
    setRequesting(true);
    const token = tokenRef.current;
    try {
      const res = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ pickup_zone: pickup, destination_zone: destination, seats_requested: seats }),
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'We could not book that ride. Please try again.');

      rideVersion.current++;
      previousStatus.current = 'REQUESTED';
      activeRideRef.current = data.ride as PassengerRide;
      setCompletedRide(null);
      setActiveRide(data.ride as PassengerRide);
      toast({ title: 'Ride requested', description: 'Finding the best pooled route for you.' });
      loadStats();
    } catch (error) {
      toast({ title: 'Could not book ride', description: (error as Error).message, variant: 'destructive' });
    } finally {
      bookingInFlight.current = false;
      setRequesting(false);
    }
  };

  const cancelRide = async () => {
    if (!activeRide || cancelling) return;
    setCancelling(true);
    const token = tokenRef.current;
    try {
      const res = await fetch(`/api/rides/${activeRide.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (res.status === 401 || res.status === 403) { signInExpired(); return; }
      if (!res.ok) {
        const data = await readApiResponse(res);
        throw new Error(data.error || 'Could not cancel the ride.');
      }
      rideVersion.current++;
      previousStatus.current = null;
      activeRideRef.current = null;
      setActiveRide(null);
      toast({ title: 'Ride cancelled', description: 'No charge for a cancelled ride.' });
      loadHistory();
      loadStats();
    } catch (error) {
      toast({ title: 'Could not cancel', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  const submitRating = async (rating: number, comment: string) => {
    if (!ratingRide || rating === 0 || submittingRating) return;
    setSubmittingRating(true);
    try {
      const res = await fetch(`/api/passenger/rides/${ratingRide.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenRef.current ?? ''}` },
        body: JSON.stringify({ rating, comment }),
      });
      if (!res.ok) throw new Error('Could not submit your rating.');
      toast({ title: 'Thanks for your feedback' });
      setRatingRide(null);
      loadHistory();
    } catch (error) {
      toast({ title: 'Rating not saved', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSubmittingRating(false);
    }
  };

  /* ------------------------------------------------------------------ view */

  const name = displayName(user?.name);
  const recentRides = useMemo(() => history.slice(0, RECENT_RIDE_LIMIT), [history]);
  const displayedRide = activeRide ?? completedRide;
  const showBooking = !displayedRide && !activeLoading;
  const canCancel = Boolean(
    activeRide && ['REQUESTED', 'MATCHED', 'ACCEPTED', 'DRIVER_ARRIVED'].includes(activeRide.status),
  );

  const closeSidebar = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) setDesktopSidebarOpen(false);
    else setSidebarOpen(false);
  };
  const openSidebar = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) setDesktopSidebarOpen(true);
    else setSidebarOpen(true);
  };

  if (!ready || activeLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0D0B]">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-[#10B981]" aria-hidden="true" />
        <p className="font-medium text-[#A1A1AA]">Loading your dashboard…</p>
      </div>
    );
  }

  const sidebarContent = (
    <>
      <div className="mb-8 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xl font-bold text-white">{name}</p>
          <p className="mt-0.5 truncate text-sm text-[#10B981]">Passenger</p>
        </div>
        <button
          type="button"
          onClick={closeSidebar}
          aria-label="Close navigation"
          className={`shrink-0 rounded-full border border-[#2C3831] bg-[#131815] p-2 text-[#A1A1AA] transition-colors hover:text-white ${FOCUS_RING}`}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <section aria-labelledby="spend-heading" className="mb-8">
        <h2 id="spend-heading" className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#8B93A0]">
          Total spent
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-[#2C3831] bg-[#131815] p-4">
            <span className="text-sm text-[#A1A1AA]">Today</span>
            <span className="text-lg font-bold tabular-nums text-white">{formatPoysha(stats.spentToday)}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-[#2C3831] bg-[#131815] p-4">
            <span className="text-sm text-[#A1A1AA]">This month</span>
            <span className="text-lg font-bold tabular-nums text-white">{formatPoysha(stats.spentThisMonth)}</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="rating-heading" className="mb-8">
        <h2 id="rating-heading" className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#8B93A0]">
          Your rating
        </h2>
        <div className="rounded-2xl border border-[#2C3831] bg-[#131815] p-4">
          <RatingAverage average={stats.averageRating} count={stats.ratingCount} />
        </div>
      </section>

      <section aria-labelledby="sidebar-history-heading" className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <h2 id="sidebar-history-heading" className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#8B93A0]">
          Ride history
        </h2>
        {history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#3F4A44] p-5 text-center text-sm text-[#8B93A0]">
            No rides yet. Your bookings will appear here.
          </p>
        ) : (
          <ul className="space-y-3">
            {history.map((ride) => (
              <li key={ride.id}><RideRow ride={ride} compact /></li>
            ))}
          </ul>
        )}
        <Link
          href="/passenger/history"
          onClick={() => setSidebarOpen(false)}
          className={`mt-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-[#F3F4F6] transition-colors hover:text-[#10B981] ${FOCUS_RING}`}
        >
          Open history page
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </>
  );

  return (
    <div className="min-h-screen bg-[#0A0D0B] font-sans text-[#F3F4F6] selection:bg-[#10B981]/30">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-[#10B981] focus:px-4 focus:py-2 focus:font-semibold focus:text-[#022C22]"
      >
        Skip to main content
      </a>

      {/* Persistent sidebar from lg, drawer below it */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'visible' : 'invisible'}`} aria-hidden={!sidebarOpen}>
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setSidebarOpen(false)}
        />
        <aside
          aria-label="Passenger navigation"
          className={`absolute left-0 top-0 flex h-full w-[320px] max-w-[85vw] flex-col overflow-hidden border-r border-[#2C3831] bg-[#0A0D0B] p-6 shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {sidebarContent}
        </aside>
      </div>

      <aside aria-label="Passenger navigation" className={`fixed left-0 top-0 z-30 hidden h-screen w-[320px] flex-col overflow-hidden border-r border-[#2C3831] bg-[#0A0D0B] p-6 ${desktopSidebarOpen ? 'lg:flex' : ''}`}>
        {sidebarContent}
      </aside>

      {ratingRide && (
        <RatingDialog
          title="Rate your trip"
          subtitle={`How was your ride from ${ratingRide.pickup_zone}?`}
          submitting={submittingRating}
          onSubmit={submitRating}
          onClose={() => setRatingRide(null)}
        />
      )}

      {showLogoutConfirm && (
        <LogoutConfirmDialog
          onCancel={closeLogoutConfirm}
          onConfirm={signOut}
        />
      )}

      <div className={desktopSidebarOpen ? 'lg:pl-[320px]' : ''}>
        <header className="sticky top-0 z-40 w-full border-b border-[#2C3831] bg-[#0A0D0B]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={openSidebar}
                aria-label="Open navigation"
                aria-expanded={sidebarOpen}
                className={`-ml-2 rounded-full p-2 text-[#A1A1AA] transition-colors hover:bg-[#131815] hover:text-[#F3F4F6] ${desktopSidebarOpen ? 'lg:hidden' : ''} ${FOCUS_RING}`}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F3F4F6]" aria-hidden="true" />
                <span className="text-lg font-bold tracking-tight">OiTesla</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <span className="hidden max-w-[12rem] truncate text-sm font-medium text-[#A1A1AA] sm:block">
                {name}
              </span>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                title="Log out"
                aria-label="Log out"
                className={`rounded-full p-2 text-[#A1A1AA] transition-colors hover:bg-[#131815] hover:text-[#F3F4F6] ${FOCUS_RING}`}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-lg space-y-6 px-4 py-8 sm:px-6">
          {showBooking ? (
            <>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-[#F3F4F6] sm:text-5xl">
                Where to?
              </h1>

              <section
                aria-labelledby="booking-heading"
                className="relative rounded-3xl border border-[#2C3831] bg-[#131815] p-6 shadow-2xl"
              >
                <h2 id="booking-heading" className="sr-only">Book a ride</h2>

                {zonesError ? (
                  <div className="space-y-4" role="alert">
                    <p className="flex items-start gap-2 text-sm font-medium text-red-200">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {zonesError}
                    </p>
                    <button
                      type="button"
                      onClick={() => loadZones()}
                      className={`inline-flex items-center gap-2 rounded-xl border border-[#2C3831] bg-[#0A0D0B] px-4 py-2.5 text-sm font-semibold text-[#F3F4F6] transition-colors hover:border-[#10B981]/60 ${FOCUS_RING}`}
                    >
                      Retry loading zones
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ZoneSelect
                        label="Pickup zone"
                        value={pickup}
                        onChange={setPickup}
                        options={zones}
                        blockedZone={destination}
                        placeholder="Pickup location"
                        loading={zonesLoading}
                      />
                      <ZoneSelect
                        label="Destination zone"
                        value={destination}
                        onChange={setDestination}
                        options={zones}
                        blockedZone={pickup}
                        placeholder="Destination"
                        loading={zonesLoading}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={swapZones}
                      disabled={!pickup || !destination}
                      className={`ml-1 inline-flex items-center gap-2 rounded-lg py-1 text-sm font-medium text-[#F3F4F6] transition-colors hover:text-[#10B981] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                    >
                      <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                      Swap pickup and destination
                    </button>

                    {sameZone && (
                      <p role="alert" className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm font-medium text-amber-200">
                        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        Pickup and destination must be different zones.
                      </p>
                    )}

                    <SeatSelector name="seats" value={seats} onChange={setSeats} describedBy="seats-help" />
                    <p id="seats-help" className="ml-1 text-xs text-[#A1A1AA]">
                      Up to 3 seats for you and your companions.
                    </p>
                  </div>
                )}

                {!zonesError && (
                  <div className="mt-8 border-t border-[#2C3831] pt-6">
                    <FareSummary
                      fare={fareIsCurrent ? fare : null}
                      loading={fareLoading || zonesLoading}
                      error={fareError}
                      onRetry={refreshFare}
                    />

                    <button
                      type="button"
                      onClick={requestRide}
                      disabled={requesting || sameZone || !fare || !fareIsCurrent || fareLoading || Boolean(zonesError)}
                      aria-busy={requesting}
                      className={`mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#F0FDF4] text-lg font-semibold text-[#022C22] transition-colors hover:bg-[#DCFCE7] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING} focus-visible:ring-offset-[#131815]`}
                    >
                      {requesting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                          Booking…
                        </>
                      ) : (
                        <>
                          <Navigation className="h-5 w-5" aria-hidden="true" />
                          Book ride
                        </>
                      )}
                    </button>
                  </div>
                )}
              </section>

              <section aria-labelledby="recent-rides-heading">
                <div className="mb-4 flex items-center justify-between px-1">
                  <h2 id="recent-rides-heading" className="text-lg font-semibold">Recent rides</h2>
                  <Link
                    href="/passenger/history"
                    className={`inline-flex items-center gap-1 rounded-lg text-sm font-medium text-[#A1A1AA] transition-colors hover:text-[#10B981] ${FOCUS_RING}`}
                  >
                    View all
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>

                {recentRides.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#3F4A44] bg-[#131815] p-8 text-center">
                    <Clock className="mx-auto mb-3 h-7 w-7 text-[#8B93A0]" aria-hidden="true" />
                    <p className="text-sm font-medium text-[#F3F4F6]">No rides yet</p>
                    <p className="mt-1 text-xs text-[#8B93A0]">Book your first pooled ride to see it here.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {recentRides.map((ride) => (
                      <li key={ride.id}><RideRow ride={ride} /></li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : displayedRide ? (
            <section aria-labelledby="active-ride-heading">
              <h1 id="active-ride-heading" className="mb-8 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Your ride
              </h1>

              <div className="rounded-3xl border border-[#2C3831] bg-[#131815] p-6 shadow-2xl sm:p-8">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#2C3831] pb-6">
                  <div className="flex min-w-[8rem] flex-1 items-center gap-4">
                    <div className="flex flex-col items-center gap-1" aria-hidden="true">
                      <span className="h-2.5 w-2.5 rounded-full bg-white" />
                      <span className="h-6 w-0.5 rounded-full bg-[#1E2621]" />
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#10B981]" />
                    </div>
                    <div className="flex h-14 min-w-0 flex-col justify-between">
                      <span className="truncate text-sm font-semibold text-[#F3F4F6]">{displayedRide.pickup_zone}</span>
                      <span className="truncate text-sm font-semibold text-[#F3F4F6]">{displayedRide.destination_zone}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#8B93A0]">Fare</p>
                    <RideAmount ride={displayedRide} className="text-xl font-bold" />
                  </div>
                </div>

                <RideProgress status={displayedRide.status} className="mb-8" />

                <div className="mt-2 flex flex-wrap items-center gap-3 rounded-2xl border border-[#2C3831] bg-[#0A0D0B] p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#2C3831] bg-[#131815] text-[#10B981]">
                    {displayedRide.status === 'COMPLETED' || !['REQUESTED', 'MATCHED'].includes(displayedRide.status)
                      ? <Car className="h-6 w-6" aria-hidden="true" />
                      : <Search className="h-6 w-6 animate-pulse" aria-hidden="true" />}
                  </div>
                  <div className="min-w-[8rem] flex-1">
                    <p className="text-sm font-semibold text-[#F3F4F6]">
                      {displayedRide.status === 'COMPLETED' ? 'Trip completed'
                        : ['REQUESTED', 'MATCHED'].includes(displayedRide.status) ? 'Finding your driver' : 'Driver assigned'}
                    </p>
                    <p className="mt-1 text-xs text-[#A1A1AA]">
                      {displayedRide.status === 'COMPLETED' ? 'You have arrived at your destination'
                        : ['REQUESTED', 'MATCHED'].includes(displayedRide.status) ? 'Matching you with a pooled ride' : 'Heading to your pickup point'}
                    </p>
                  </div>
                  <RideStatusBadge status={displayedRide.status} className="ml-auto shrink-0" />
                </div>

                {displayedRide.status === 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => setCompletedRide(null)}
                    className={`mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#F0FDF4] text-sm font-semibold text-[#022C22] transition-colors hover:bg-[#DCFCE7] ${FOCUS_RING}`}
                  >
                    Book another ride
                  </button>
                )}

                {canCancel && (
                  <div className="mt-8 border-t border-[#2C3831] pt-6">
                    <button
                      type="button"
                      onClick={cancelRide}
                      disabled={cancelling}
                      aria-busy={cancelling}
                      className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 text-sm font-semibold text-red-300 transition-colors hover:border-red-500/50 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                    >
                      {cancelling
                        ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        : <X className="h-4 w-4" aria-hidden="true" />}
                      {cancelling ? 'Cancelling…' : 'Cancel ride'}
                    </button>
                    <p className="mt-3 text-center text-xs text-[#8B93A0]">No fee if you cancel before the driver arrives.</p>
                  </div>
                )}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
