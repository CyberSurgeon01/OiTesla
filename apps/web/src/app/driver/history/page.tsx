"use client";
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RideAmount, RideStatusBadge } from '@/components/passenger/ride-row';
import { RatingAverage, RatingStars } from '@/components/rating-stars';
import { RatingDialog } from '@/components/rating-dialog';
import { averageRating } from '@/lib/rating';
import { formatDhakaDate } from '@/lib/datetime';
import type { DriverPool, DriverRide } from '@/lib/ride-status';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Calendar, Clock, User, Star } from 'lucide-react';

export default function DriverHistory() {
  const [history, setHistory] = useState<DriverPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingRide, setRatingRide] = useState<DriverRide | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const loadHistory = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const res = await fetch(`/api/driver/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const submitRating = async (rating: number, comment: string) => {
    if (!ratingRide || rating === 0 || submittingRating) return;
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    setSubmittingRating(true);
    try {
      const res = await fetch(`/api/driver/rides/${ratingRide.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, comment }),
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }
      if (!res.ok) throw new Error('Could not submit your rating.');
      toast({ title: 'Thanks for the feedback' });
      setRatingRide(null);
      await loadHistory();
    } catch (error) {
      toast({ title: 'Rating not saved', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSubmittingRating(false);
    }
  };

  // Every completed ride across every pool, so the headline score covers the whole history
  // rather than only the pools that happen to be rendered.
  const completedRides = history.flatMap((pool) => pool.rideRequests.filter((ride) => ride.status === 'COMPLETED'));
  const ratingsReceived = completedRides.map((ride) => ride.rating);
  const ratingCount = ratingsReceived.filter((value): value is number => typeof value === 'number').length;

  return (
    <div className="min-h-screen bg-[#0A0D0B] text-[#F3F4F6] font-sans selection:bg-[#10B981]/30 pb-20">
      <header className="sticky top-0 z-40 w-full bg-[#0A0D0B]/90 backdrop-blur-xl border-b border-[#2C3831]">
        <div className="max-w-screen-xl mx-auto flex h-16 items-center px-6 gap-4">
          <Link href="/driver/dashboard" className="p-2 -ml-2 rounded-full hover:bg-[#131815] transition-colors text-[#A1A1AA] hover:text-[#F3F4F6]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-bold text-lg tracking-tight">Trip History</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#10B981]" />
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#3F3F46] p-12 text-center text-[#A1A1AA] bg-[#131815]">
            <Clock className="mx-auto h-8 w-8 opacity-50 mb-3" />
            <p>No completed trips yet</p>
          </div>
        ) : (
          <>
            <section aria-labelledby="history-rating-heading" className="bg-[#131815] border border-[#2C3831] rounded-2xl p-5">
              <h2 id="history-rating-heading" className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]">
                <Star className="w-4 h-4" aria-hidden="true" />
                Rating from passengers
              </h2>
              <RatingAverage average={averageRating(ratingsReceived)} count={ratingCount} />
            </section>

            <div className="space-y-4">
              {history.map((pool) => {
                const poolRides = pool.rideRequests.filter((ride) => ride.status === 'COMPLETED');
                const totalFare = poolRides.reduce((acc, ride) => acc + (ride.fare_amount || 0), 0);
                const totalSeats = poolRides.reduce((acc, ride) => acc + (ride.seats_requested || 0), 0);

                return (
                  <div key={pool.id} className="bg-[#131815] border border-[#2C3831] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                    <div className="p-5 border-b border-[#2C3831] flex justify-between items-center bg-[#1E2621]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#A1A1AA]" />
                        <span className="text-sm font-medium text-[#A1A1AA]">
                          {formatDhakaDate(pool.createdAt)}
                        </span>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-widest text-[#10B981]">
                        {pool.status}
                      </span>
                    </div>
                    
                    <div className="p-5">
                      <div className="flex justify-between items-end mb-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#A1A1AA] mb-1">Total Earnings</span>
                          <span className="font-semibold text-3xl text-[#F3F4F6]">
                            ৳{(totalFare / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-[#A1A1AA] bg-[#0A0D0B] border border-[#2C3831] px-3 py-1 rounded-full mb-1 flex items-center gap-1.5">
                          <User className="w-4 h-4" /> {totalSeats} Passenger{totalSeats > 1 ? 's' : ''}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <span className="text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]">Trip Details</span>
                        <div className="divide-y divide-[#2C3831] border border-[#2C3831] rounded-xl overflow-hidden">
                          {pool.rideRequests.map((ride) => (
                            <div key={ride.id} className="p-3 bg-[#0A0D0B] flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-[#F3F4F6]">{ride.passenger.name}</span>
                                  <span className="text-xs text-[#A1A1AA] mt-0.5">{ride.pickup_zone} → {ride.destination_zone}</span>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <RideStatusBadge status={ride.status} />
                                  <RideAmount ride={ride} />
                                </div>
                              </div>
                              {ride.rating != null && (
                                <div className="flex flex-col gap-1 border-t border-[#1E2621] pt-2 mt-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-[#8B93A0]">They rated you</span>
                                    <RatingStars rating={ride.rating} />
                                  </div>
                                  {ride.rating_comment && (
                                    <span className="text-xs text-[#A1A1AA] italic">&ldquo;{ride.rating_comment}&rdquo;</span>
                                  )}
                                </div>
                              )}
                              {ride.driver_rating != null && (
                                <div className="flex flex-col gap-1 border-t border-[#1E2621] pt-2 mt-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-[#8B93A0]">You rated them</span>
                                    <RatingStars rating={ride.driver_rating} />
                                  </div>
                                  {ride.driver_rating_comment && (
                                    <span className="text-xs text-[#A1A1AA] italic">&ldquo;{ride.driver_rating_comment}&rdquo;</span>
                                  )}
                                </div>
                              )}
                              {ride.status === 'COMPLETED' && ride.driver_rating == null && (
                                <div className="border-t border-[#1E2621] pt-2 mt-1">
                                  <button
                                    type="button"
                                    onClick={() => setRatingRide(ride)}
                                    className="rounded-lg border border-[#2C3831] bg-[#131815] px-3 py-1.5 text-xs font-semibold text-[#A1A1AA] transition-colors hover:border-[#10B981]/60 hover:text-white"
                                  >
                                    Rate {ride.passenger.name}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {ratingRide && (
        <RatingDialog
          title="Rate your rider"
          subtitle={`How was ${ratingRide.passenger.name} as a passenger?`}
          submitting={submittingRating}
          onSubmit={submitRating}
          onClose={() => setRatingRide(null)}
        />
      )}
    </div>
  );
}
