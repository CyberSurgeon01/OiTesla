"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, MapPin, Navigation, Flag, LogOut, ArrowRight, Clock, Car } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DriverDashboard() {
  const [user, setUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activePools, setActivePools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();

  const fetchPools = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/driver/pools`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const pools = await res.json();
        setActivePools(pools);
        if (pools.length > 0 && pools[0].vehicle) {
          setIsOnline(pools[0].vehicle.status === 'ONLINE');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }
    
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'DRIVER') {
      router.push('/passenger/dashboard');
      return;
    }
    
    setUser(parsedUser);
    fetchPools(token);
    
    const interval = setInterval(() => fetchPools(token), 5000);
    return () => clearInterval(interval);
  }, [router]);

  const toggleOnline = async () => {
    setStatusLoading(true);
    const token = localStorage.getItem('token');
    const newStatus = isOnline ? 'OFFLINE' : 'ONLINE';
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/driver/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setIsOnline(!isOnline);
        toast({ 
          title: !isOnline ? "You are Online" : "You are Offline",
          description: !isOnline ? "Waiting for ride requests" : "You will not receive new requests",
          variant: "default"
        });
      } else {
        throw new Error();
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally {
      setStatusLoading(false);
    }
  };

  const transitionPool = async (poolId: number, status: string) => {
    setActionLoading(poolId);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/driver/pools/${poolId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchPools(token as string);
        toast({ title: `Status Updated`, description: `Pool marked as ${status.replace('_', ' ')}` });
      } else {
        const data = await res.json();
        toast({ title: "Action Failed", description: data.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Network error occurred", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-[#0A0D0B] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#10B981] animate-spin mb-4" />
        <div className="text-[#88928B] font-medium">Loading your dashboard...</div>
      </div>
    );
  }

  const activeAndNotCancelled = (ride: any) => ride.status !== 'CANCELLED' && ride.status !== 'COMPLETED';
  
  const pendingPools = activePools.filter(p => 
    p.rideRequests.some((r: any) => activeAndNotCancelled(r) && (r.status === 'REQUESTED' || r.status === 'MATCHED'))
  );
  
  const inProgressPools = activePools.filter(p => 
    p.rideRequests.some((r: any) => activeAndNotCancelled(r) && ['ACCEPTED', 'DRIVER_ARRIVED', 'STARTED'].includes(r.status))
  );

  const currentPool = activePools.length > 0 ? activePools[0] : null;
  const maxSeats = currentPool?.vehicle?.seat_capacity || 4;
  const allActiveRides = activePools.flatMap(p => p.rideRequests).filter(activeAndNotCancelled);
  const filledSeats = allActiveRides.reduce((acc, r) => acc + r.seats_requested, 0);

  // Determine sticky action state for the active trip (if any)
  let activeStickyAction: any = null;
  if (inProgressPools.length > 0) {
    const pool = inProgressPools[0];
    const rides = pool.rideRequests.filter(activeAndNotCancelled);
    const currentState = rides[0]?.status;

    let nextState = '';
    let buttonLabel = '';
    let ButtonIcon = MapPin;

    if (currentState === 'ACCEPTED') {
      nextState = 'DRIVER_ARRIVED';
      buttonLabel = 'Mark as Arrived';
      ButtonIcon = MapPin;
    } else if (currentState === 'DRIVER_ARRIVED') {
      nextState = 'STARTED';
      buttonLabel = 'Start Trip';
      ButtonIcon = Navigation;
    } else if (currentState === 'STARTED') {
      nextState = 'COMPLETED';
      buttonLabel = 'Complete Trip';
      ButtonIcon = Flag;
    }

    if (nextState) {
      activeStickyAction = { poolId: pool.id, nextState, buttonLabel, ButtonIcon };
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0D0B] text-[#F3F4F6] font-sans selection:bg-[#10B981]/30 pb-32 sm:pb-12">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-[#0A0D0B]/90 backdrop-blur-xl border-b border-[#1E2621]">
        <div className="max-w-screen-xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
            <span className="font-bold text-lg tracking-tight">OiTesla Driver</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-[#88928B] hidden sm:block">{user.name}</span>
            <button onClick={logout} className="p-2 rounded-full hover:bg-[#131815] transition-colors text-[#88928B] hover:text-[#F3F4F6]">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-6 mt-4 space-y-8">
        
        {/* Tesla Capacity Persistent Indicator */}
        <div className="bg-[#131815] border border-[#1E2621] rounded-2xl p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-semibold text-lg text-[#F3F4F6]">Tesla Occupancy</span>
            <span className="text-sm text-[#88928B] mt-0.5">
              {filledSeats} / {maxSeats} Seats Filled
            </span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: maxSeats }).map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                  i < filledSeats ? "bg-[#10B981] border-[#10B981] text-[#0A0D0B]" : "bg-[#0D110E] border-[#1E2621] text-[#1E2621]"
                )} 
              >
                <User className="w-4 h-4" />
              </div>
            ))}
          </div>
        </div>

        {/* Online Toggle */}
        <div className="bg-[#131815] border border-[#1E2621] rounded-2xl p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-semibold text-lg text-[#F3F4F6]">Accepting Rides</span>
            <span className="text-sm text-[#88928B] mt-0.5">
              {isOnline ? "You're visible to passengers" : "Go online to receive requests"}
            </span>
          </div>
          <button
            onClick={toggleOnline}
            disabled={statusLoading}
            className={cn(
              "relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:opacity-50",
              isOnline ? "bg-[#131815] border border-[#1E2621]" : "bg-[#0D110E] border border-[#1E2621]"
            )}
          >
            <span
              className={cn(
                "pointer-events-none block h-6 w-6 rounded-full transition-transform",
                isOnline ? "translate-x-7 bg-[#10B981]" : "translate-x-1 bg-[#4B5563]"
              )}
            />
          </button>
        </div>

        {/* Incoming Requests */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-[#F3F4F6]">Incoming Requests</h2>
          {pendingPools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#1E2621] p-8 text-center text-[#88928B] bg-[#0A0D0B]">
              <Navigation className="mx-auto h-8 w-8 opacity-50 mb-3" />
              <p>No new requests</p>
            </div>
          ) : (
            pendingPools.map(pool => {
              const activeRides = pool.rideRequests.filter(activeAndNotCancelled);
              const seatsUsed = activeRides.reduce((acc: number, r: any) => acc + r.seats_requested, 0);
              
              return (
                <div key={pool.id} className="bg-[#131815] border border-[#1E2621] rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-[#1E2621] flex justify-between items-center">
                    <span className="text-[#F3F4F6] font-semibold">New Pool Assignment</span>
                    <div className="text-xs font-semibold uppercase tracking-widest text-[#10B981]">
                      +{seatsUsed} seats
                    </div>
                  </div>
                  
                  <div className="divide-y divide-[#1E2621]">
                    {activeRides.map((ride: any) => (
                      <div key={ride.id} className="p-5 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center text-sm font-medium text-[#F3F4F6]">
                            <User className="mr-2 h-4 w-4 text-[#88928B]" />
                            {ride.passenger.name} 
                            <span className="ml-2 text-[#88928B]">({ride.seats_requested} seat)</span>
                          </div>
                          <div className="font-semibold text-lg text-[#F3F4F6]">
                            ৳{(ride.fare_amount / 100).toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-white" />
                            <div className="w-[1px] h-4 bg-[#1E2621]" />
                            <div className="w-2 h-2 rounded-sm bg-[#10B981]" />
                          </div>
                          <div className="flex flex-col justify-between h-10 text-sm text-[#88928B]">
                            <span>{ride.pickup_zone}</span>
                            <span>{ride.destination_zone}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-5 bg-[#0D110E]">
                    <button 
                      onClick={() => transitionPool(pool.id, 'ACCEPTED')}
                      disabled={actionLoading === pool.id}
                      className="w-full h-12 rounded-xl bg-[#F0FDF4] text-[#022C22] font-semibold text-sm transition-all duration-300 hover:bg-[#DCFCE7] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading === pool.id && <Loader2 className="w-4 h-4 animate-spin" />}
                      Accept Pool
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Active Trip */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-[#F3F4F6]">Active Trip</h2>
          {inProgressPools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#1E2621] p-8 text-center text-[#88928B] bg-[#0A0D0B]">
              <MapPin className="mx-auto h-8 w-8 opacity-50 mb-3" />
              <p>No trip in progress</p>
            </div>
          ) : (
            inProgressPools.map(pool => {
              const activeRides = pool.rideRequests.filter(activeAndNotCancelled);
              
              return (
                <div key={pool.id} className="bg-[#131815] border border-[#1E2621] rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-[#1E2621] flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                      <span className="font-semibold text-[#F3F4F6]">Live Trip</span>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-[#1E2621]">
                    {activeRides.map((ride: any) => (
                      <div key={ride.id} className="p-5 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm text-[#F3F4F6]">{ride.passenger.name}</span>
                            <span className="text-xs text-[#10B981] mt-1 font-semibold uppercase tracking-wider">{ride.status.replace('_', ' ')}</span>
                          </div>
                          <div className="font-medium bg-[#0D110E] border border-[#1E2621] px-2 py-1 rounded text-sm text-[#F3F4F6]">
                            ৳{(ride.fare_amount / 100).toFixed(2)}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-white" />
                            <div className="w-[1px] h-4 bg-[#1E2621]" />
                            <div className="w-2 h-2 rounded-sm bg-[#10B981]" />
                          </div>
                          <div className="flex flex-col justify-between h-10 text-sm text-[#88928B]">
                            <span>{ride.pickup_zone}</span>
                            <span>{ride.destination_zone}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Trip History Access */}
        <div className="pt-4 pb-12 sm:pb-0">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-semibold text-lg text-[#F3F4F6]">Trip History</h3>
            <Link href="/driver/history" className="text-sm font-medium text-[#10B981] hover:text-[#F3F4F6] transition-colors flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <Link href="/driver/history">
             <div className="bg-[#131815] border border-[#1E2621] rounded-2xl p-5 flex items-center justify-between hover:bg-[#1A211D] transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#0A0D0B] border border-[#1E2621] flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#88928B]" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-[#F3F4F6]">Past Trips</div>
                    <div className="text-xs text-[#88928B] mt-0.5">Review your completed pools</div>
                  </div>
                </div>
                <div className="text-[#88928B]"><ArrowRight className="w-4 h-4" /></div>
             </div>
          </Link>
        </div>

      </main>

      {/* Sticky Bottom Action Bar for Active Trip */}
      {activeStickyAction && (
        <div className="fixed bottom-0 left-0 w-full p-4 sm:p-6 bg-gradient-to-t from-[#0A0D0B] via-[#0A0D0B]/90 to-transparent z-40">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => transitionPool(activeStickyAction.poolId, activeStickyAction.nextState)}
              disabled={actionLoading === activeStickyAction.poolId}
              className="w-full h-14 rounded-xl bg-[#F0FDF4] text-[#022C22] font-semibold text-lg transition-all duration-300 hover:bg-[#DCFCE7] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading === activeStickyAction.poolId ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <activeStickyAction.ButtonIcon className="w-5 h-5" />
              )}
              {activeStickyAction.buttonLabel}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
