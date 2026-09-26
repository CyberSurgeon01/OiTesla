"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, MapPin, Calendar, Clock } from 'lucide-react';

export default function PassengerHistory() {
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/passenger/rides/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          data.sort((a: any, b: any) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
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
      <header className="sticky top-0 z-40 w-full bg-[#0A0D0B]/90 backdrop-blur-xl border-b border-[#2C3831]">
        <div className="max-w-screen-xl mx-auto flex h-16 items-center px-6 gap-4">
          <Link href="/passenger/dashboard" className="p-2 -ml-2 rounded-full hover:bg-[#131815] transition-colors text-[#A1A1AA] hover:text-[#F3F4F6]">
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
            <p>No past trips found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((ride: any) => (
              <div key={ride.id} className="bg-[#131815] border border-[#2C3831] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                <div className="p-5 border-b border-[#2C3831] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#A1A1AA]" />
                    <span className="text-sm font-medium text-[#A1A1AA]">
                      {new Date(ride.requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-widest ${ride.status === 'COMPLETED' ? 'text-[#10B981]' : 'text-red-500/80'}`}>
                    {ride.status}
                  </span>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="font-semibold text-2xl text-[#F3F4F6]">
                      ৳{(ride.fare_amount / 100).toFixed(2)}
                    </div>
                    <div className="text-sm font-medium text-[#A1A1AA] bg-[#1E2621] border border-[#2C3831] px-3 py-1 rounded-full">
                      {ride.seats_requested} Seat{ride.seats_requested > 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-white" />
                      <div className="w-[1px] h-4 bg-[#2C3831]" />
                      <div className="w-2 h-2 rounded-sm bg-[#10B981]" />
                    </div>
                    <div className="flex flex-col justify-between h-10 text-sm text-[#A1A1AA]">
                      <span>{ride.pickup_zone}</span>
                      <span>{ride.destination_zone}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
