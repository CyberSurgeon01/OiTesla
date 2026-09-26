"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, MapPin, Calendar, Clock, User } from 'lucide-react';

export default function DriverHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/driver/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (error) {
        console.error('Failed to fetch history', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0A0D0B] text-[#F3F4F6] font-sans selection:bg-[#10B981]/30 pb-20">
      <header className="sticky top-0 z-40 w-full bg-[#0A0D0B]/90 backdrop-blur-xl border-b border-[#1E2621]">
        <div className="max-w-screen-xl mx-auto flex h-16 items-center px-6 gap-4">
          <Link href="/driver/dashboard" className="p-2 -ml-2 rounded-full hover:bg-[#131815] transition-colors text-[#88928B] hover:text-[#F3F4F6]">
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
          <div className="rounded-2xl border border-dashed border-[#1E2621] p-12 text-center text-[#88928B] bg-[#0A0D0B]">
            <Clock className="mx-auto h-8 w-8 opacity-50 mb-3" />
            <p>No completed trips yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((pool: any) => {
              const totalFare = pool.rideRequests.reduce((acc: number, r: any) => acc + (r.fare_amount || 0), 0);
              const totalSeats = pool.rideRequests.reduce((acc: number, r: any) => acc + (r.seats_requested || 0), 0);

              return (
                <div key={pool.id} className="bg-[#131815] border border-[#1E2621] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                  <div className="p-5 border-b border-[#1E2621] flex justify-between items-center bg-[#0D110E]">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#88928B]" />
                      <span className="text-sm font-medium text-[#88928B]">
                        {new Date(pool.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#10B981]">
                      {pool.status}
                    </span>
                  </div>
                  
                  <div className="p-5">
                    <div className="flex justify-between items-end mb-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[#88928B] mb-1">Total Earnings</span>
                        <span className="font-semibold text-3xl text-[#F3F4F6]">
                          ৳{(totalFare / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-[#88928B] bg-[#0A0D0B] border border-[#1E2621] px-3 py-1 rounded-full mb-1 flex items-center gap-1.5">
                        <User className="w-4 h-4" /> {totalSeats} Passenger{totalSeats > 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[#88928B]">Trip Details</span>
                      <div className="divide-y divide-[#1E2621] border border-[#1E2621] rounded-xl overflow-hidden">
                        {pool.rideRequests.map((ride: any) => (
                          <div key={ride.id} className="p-3 bg-[#0A0D0B] flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-[#F3F4F6]">{ride.passenger.name}</span>
                              <span className="text-xs text-[#88928B] mt-0.5">{ride.pickup_zone} → {ride.destination_zone}</span>
                            </div>
                            <span className="text-sm font-semibold text-[#F3F4F6]">
                              ৳{(ride.fare_amount / 100).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
