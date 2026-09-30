"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readStoredUser } from '@/lib/session';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Menu, X, User, MapPin, Navigation, Flag, LogOut, ArrowRight, Clock, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { readApiResponse } from '@/lib/api-response';

const STEPS = ['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED'];

export default function DriverDashboard() {
  const [user, setUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activePools, setActivePools] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [stats, setStats] = useState({ gainedToday: 0, gainedThisMonth: 0 });
  const [fullHistory, setFullHistory] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  
  const router = useRouter();
  const { toast } = useToast();

  const fetchPools = async (token: string) => {
    try {
      const [res, reqRes, statusRes] = await Promise.all([
        fetch('/api/driver/pools', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/driver/requests', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/driver/status', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (statusRes.ok) setIsOnline((await readApiResponse(statusRes)).status === 'ONLINE');
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }
      if (res.ok) {
        const pools = await res.json();
        setActivePools(pools);
      }
      if (reqRes.ok) {
        const requests = await reqRes.json();
        setPendingRequests(requests);
      
      fetch('/api/driver/stats', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json()).then(data => { if(!data.error) setStats(data); });
        
      fetch('/api/driver/history', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json()).then(data => { if(Array.isArray(data)) setFullHistory(data); });
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
    
    const parsedUser = readStoredUser();
    if (!parsedUser) { router.push('/login'); return; }
    if (parsedUser.role !== 'DRIVER') {
      router.push('/passenger/dashboard');
      return;
    }
    
    setUser(parsedUser);
    fetchPools(token);
    
    const interval = setInterval(() => fetchPools(token), 1000);
    return () => clearInterval(interval);
  }, [router]);

  const toggleOnline = async () => {
    setStatusLoading(true);
    const token = localStorage.getItem('token');
    const newStatus = isOnline ? 'OFFLINE' : 'ONLINE';
    
    try {
      const res = await fetch('/api/driver/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      setIsOnline(data.status === 'ONLINE');
      toast({ title: data.status === 'ONLINE' ? 'You are Online' : 'You are Offline' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setStatusLoading(false);
    }
  };

  const transitionPool = async (poolId: number, status: string) => {
    setActionLoading(poolId);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/driver/pools/${poolId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }
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

  const acceptRequest = async (rideId: number) => {
    setActionLoading(rideId);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/driver/requests/${rideId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }
      if (res.ok) {
        fetchPools(token as string);
        toast({ title: `Request Accepted`, description: `You have accepted the ride.` });
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
        <div className="text-[#A1A1AA] font-medium">Loading your dashboard...</div>
      </div>
    );
  }

  const activeAndNotCancelled = (ride: any) => ride.status !== 'CANCELLED' && ride.status !== 'COMPLETED';
  
  const inProgressPools = activePools.filter(p => 
    p.rideRequests.some((r: any) => activeAndNotCancelled(r) && ['ACCEPTED', 'DRIVER_ARRIVED', 'STARTED'].includes(r.status))
  );

  const currentPool = activePools.length > 0 ? activePools[0] : null;
  const maxSeats = currentPool?.vehicle?.seat_capacity || 3;
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

  const sidebarContent = (
    <>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
              <p className="text-sm text-[#10B981] capitalize">{user?.role?.toLowerCase()}</p>
            </div>
            <button type="button" aria-label="Close navigation" onClick={() => { setIsSidebarOpen(false); setDesktopSidebarOpen(false); }} className="p-2 bg-[#131815] rounded-full text-gray-400 hover:text-white transition-colors border border-[#2C3831]">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-3 mb-8">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Total Gained</h3>
            <div className="bg-[#131815] border border-[#2C3831] rounded-2xl p-4 flex justify-between items-center">
              <span className="text-sm text-gray-400">Today</span>
              <span className="text-lg font-bold text-white">৳{stats.gainedToday.toFixed(2)}</span>
            </div>
            <div className="bg-[#131815] border border-[#2C3831] rounded-2xl p-4 flex justify-between items-center">
              <span className="text-sm text-gray-400">This Month</span>
              <span className="text-lg font-bold text-white">৳{stats.gainedThisMonth.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Past Pools</h3>
            <div className="space-y-3">
              {fullHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No pools yet.</p>
              ) : (
                fullHistory.map((pool, idx) => {
                  const completedRides = pool.rideRequests.filter((r: any) => r.status === 'COMPLETED');
                  const totalEarned = completedRides.reduce((acc: number, r: any) => acc + r.fare_amount, 0);
                  return (
                    <div key={idx} className="bg-[#131815] border border-[#2C3831] rounded-xl p-4 flex flex-col gap-2 hover:border-[#10B981]/50 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">{new Date(pool.createdAt).toLocaleDateString()}</span>
                        <span className="font-semibold text-[#10B981]">৳{(totalEarned / 100).toFixed(2)}</span>
                      </div>
                      <div className="text-sm font-medium text-white">{completedRides.length} ride{completedRides.length !== 1 ? 's' : ''}</div>
                      <div className="text-xs text-gray-500 capitalize">{pool.status.toLowerCase()}</div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#0A0D0B] text-[#F3F4F6] font-sans selection:bg-[#10B981]/30 pb-32 sm:pb-12 relative">
      <div className={`fixed inset-0 z-50 lg:hidden ${isSidebarOpen ? 'visible' : 'invisible'}`} aria-hidden={!isSidebarOpen}>
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsSidebarOpen(false)}
        />
        <aside aria-label="Driver navigation" className={`absolute top-0 left-0 w-[320px] max-w-[85vw] h-full bg-[#0A0D0B] border-r border-[#2C3831] flex flex-col p-6 overflow-y-auto transition-transform duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarContent}
        </aside>
      </div>

      <aside aria-label="Driver navigation" className={`fixed left-0 top-0 z-30 hidden h-screen w-[320px] flex-col overflow-y-auto border-r border-[#2C3831] bg-[#0A0D0B] p-6 ${desktopSidebarOpen ? 'lg:flex' : ''}`}>
        {sidebarContent}
      </aside>

      <div className={desktopSidebarOpen ? 'lg:pl-[320px]' : ''}>

      
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-[#0A0D0B]/90 backdrop-blur-xl border-b border-[#2C3831]">
        <div className="max-w-screen-xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={isSidebarOpen}
              onClick={() => { setIsSidebarOpen(true); setDesktopSidebarOpen(true); }}
              className={`-ml-2 rounded-full p-2 text-[#A1A1AA] hover:bg-[#131815] hover:text-white ${desktopSidebarOpen ? 'lg:hidden' : ''}`}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="w-2.5 h-2.5 rounded-full bg-[#F3F4F6]" />
            <span className="font-bold text-lg tracking-tight">OiTesla Driver</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-[#A1A1AA] hidden sm:block">{user.name}</span>
            <button onClick={logout} className="p-2 rounded-full hover:bg-[#131815] transition-colors text-[#A1A1AA] hover:text-[#F3F4F6]">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-6 mt-4 space-y-8">
        
        {/* Tesla Capacity Persistent Indicator */}
        <div className="bg-[#131815] border border-[#2C3831] rounded-2xl p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-semibold text-lg text-[#F3F4F6]">Tesla Occupancy</span>
            <span className="text-sm text-[#A1A1AA] mt-0.5">
              {filledSeats} / {maxSeats} Seats Filled
            </span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: maxSeats }).map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                  i < filledSeats ? "bg-[#10B981] border-[#10B981] text-[#0A0D0B]" : "bg-[#1E2621] border-[#2C3831] text-[#1E2621]"
                )} 
              >
                <User className="w-4 h-4" />
              </div>
            ))}
          </div>
        </div>

        {/* Online Toggle */}
        <div className="bg-[#131815] border border-[#2C3831] rounded-2xl p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-semibold text-lg text-[#F3F4F6]">Accepting Rides</span>
            <span className="text-sm text-[#A1A1AA] mt-0.5">
              {isOnline ? "You're visible to passengers" : "Go online to receive requests"}
            </span>
          </div>
          <button
            onClick={toggleOnline}
            disabled={statusLoading}
            className={cn(
              "relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:opacity-50",
              isOnline ? "bg-[#131815] border border-[#2C3831]" : "bg-[#131815] border border-[#2C3831]"
            )}
          >
            <span
              className={cn(
                "pointer-events-none block h-6 w-6 rounded-full transition-transform",
                isOnline ? "translate-x-7 bg-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "translate-x-1 bg-[#A1A1AA]"
              )}
            />
          </button>
        </div>

        {/* Incoming Requests */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-[#F3F4F6]">Incoming Requests</h2>
          {pendingRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#3F3F46] p-8 text-center text-[#A1A1AA] bg-[#131815]">
              <Navigation className="mx-auto h-8 w-8 opacity-50 mb-3" />
              <p>No new requests</p>
            </div>
          ) : (
            pendingRequests.map(ride => {
              return (
                <div key={ride.id} className="bg-[#131815] border border-[#2C3831] rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-[#2C3831] flex justify-between items-center">
                    <span className="text-[#F3F4F6] font-semibold">New Ride Request</span>
                    <div className="text-xs font-semibold uppercase tracking-widest text-[#10B981]">
                      +{ride.seats_requested} seats
                    </div>
                  </div>
                  
                  <div className="divide-y divide-[#1E2621]">
                      <div className="p-5 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center text-sm font-medium text-[#F3F4F6]">
                            <User className="mr-2 h-4 w-4 text-[#A1A1AA]" />
                            {ride.passenger.name} 
                            <span className="ml-2 text-[#A1A1AA]">({ride.seats_requested} seat)</span>
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
                          <div className="flex flex-col justify-between h-10 text-sm text-[#A1A1AA]">
                            <span>{ride.pickup_zone}</span>
                            <span>{ride.destination_zone}</span>
                          </div>
                        </div>
                      </div>
                  </div>

                  <div className="p-5 bg-[#1E2621]">
                    <button 
                      onClick={() => acceptRequest(ride.id)}
                      disabled={actionLoading === ride.id}
                      className="w-full h-12 rounded-xl bg-[#F0FDF4] text-[#022C22] font-semibold text-sm transition-all duration-300 hover:bg-[#DCFCE7] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading === ride.id && <Loader2 className="w-4 h-4 animate-spin" />}
                      Accept Request
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
            <div className="rounded-2xl border border-dashed border-[#3F3F46] p-8 text-center text-[#A1A1AA] bg-[#131815]">
              <MapPin className="mx-auto h-8 w-8 opacity-50 mb-3" />
              <p>No trip in progress</p>
            </div>
          ) : (
            inProgressPools.map(pool => {
              const activeRides = pool.rideRequests.filter(activeAndNotCancelled);
              
              return (
                <div key={pool.id} className="bg-[#131815] border border-[#2C3831] rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-[#2C3831] flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                      <span className="font-semibold text-[#F3F4F6]">Live Trip</span>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-[#1E2621]">
                    {activeRides.map((ride: any) => (
                      <div key={ride.id} className="p-5 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center text-sm font-medium text-[#F3F4F6]">
                            <User className="mr-2 h-4 w-4 text-[#A1A1AA]" />
                            {ride.passenger.name} 
                            <span className="ml-2 text-[#A1A1AA]">({ride.seats_requested} seat{ride.seats_requested > 1 ? 's' : ''})</span>
                          </div>
                          <div className="font-medium bg-[#1E2621] border border-[#2C3831] px-2 py-1 rounded text-sm text-[#F3F4F6]">
                            ৳{(ride.fare_amount / 100).toFixed(2)}
                          </div>
                        </div>

                        {/* Advanced Stepper */}
                        <div className="mt-2 mb-16 px-10 sm:px-12">
                          <div className="relative h-5 flex items-center">
                            <div className="absolute left-0 right-0 h-0.5 bg-[#1E2621]" />
                            <div 
                              className="absolute left-0 h-0.5 bg-[#10B981] transition-all duration-700 ease-in-out" 
                              style={{ width: `${(Math.max(0, STEPS.indexOf(ride.status)) / (STEPS.length - 1)) * 100}%` }}
                            />
                            
                            <div className="absolute left-0 right-0 flex justify-between">
                              {STEPS.map((step, index) => {
                                const currentStepIndex = Math.max(0, STEPS.indexOf(ride.status));
                                const isActive = index === currentStepIndex;
                                const isPast = index <= currentStepIndex;
                                
                                return (
                                  <div key={step} className="relative flex justify-center w-0">
                                    <div className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
                                      isPast && !isActive ? 'bg-[#10B981]' : 
                                      isActive ? 'bg-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'bg-[#131815] border border-[#2C3831]'
                                    }`}>
                                      {isActive && (
                                        <>
                                          <div className="absolute inset-0 rounded-full bg-[#10B981] animate-ping opacity-50" />
                                          <div className="relative w-2 h-2 rounded-full bg-[#0A0D0B] z-20" />
                                        </>
                                      )}
                                      {isPast && !isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                    <span className={`absolute top-5 mt-2 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest w-24 transition-all duration-300 ${
                                      index === 0 ? 'left-[-10px] text-left' : 
                                      index === STEPS.length - 1 ? 'right-[-10px] text-right' : 
                                      'left-1/2 -translate-x-1/2 text-center'
                                    } ${
                                      isActive ? 'text-[#10B981] drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] scale-105' : 
                                      isPast ? 'text-[#F3F4F6]' : 'text-[#3F3F46]'
                                    }`}>
                                      {step.replace('_', ' ')}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-white" />
                            <div className="w-[1px] h-4 bg-[#1E2621]" />
                            <div className="w-2 h-2 rounded-sm bg-[#10B981]" />
                          </div>
                          <div className="flex flex-col justify-between h-10 text-sm text-[#A1A1AA]">
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

        
        {/* Recent Pools */}
        <div className="pt-4 pb-12 sm:pb-0 mb-10">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-semibold text-lg text-[#F3F4F6]">Recent Pools</h3>
          </div>
          <div className="space-y-3">
             {fullHistory.slice(0, 3).map((pool, idx) => {
                const completedRides = pool.rideRequests.filter((r: any) => r.status === 'COMPLETED');
                const totalEarned = completedRides.reduce((acc: number, r: any) => acc + r.fare_amount, 0);
                return (
                  <div key={idx} className="bg-[#131815] border border-[#2C3831] rounded-2xl p-5 flex items-center justify-between hover:bg-[#1A211D] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#0A0D0B] border border-[#2C3831] flex items-center justify-center">
                        <Clock className="w-5 h-5 text-[#A1A1AA]" />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-[#F3F4F6]">{completedRides.length} ride{completedRides.length !== 1 ? 's' : ''}</div>
                        <div className="text-xs text-[#6B7280] mt-0.5">{pool.status.toLowerCase()} • {new Date(pool.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="font-semibold text-sm text-[#F3F4F6]">৳{(totalEarned / 100).toFixed(2)}</div>
                  </div>
                )
             })}
             {fullHistory.length === 0 && <p className="text-gray-500 text-sm">No recent pools.</p>}
          </div>
        </div>

      </main>

      {/* Sticky Bottom Action Bar for Active Trip */}
      {activeStickyAction && (
        <div className={`fixed bottom-0 left-0 w-full p-4 sm:p-6 bg-gradient-to-t from-[#0A0D0B] via-[#0A0D0B]/90 to-transparent z-40 ${desktopSidebarOpen ? 'lg:left-[320px] lg:w-[calc(100%-320px)]' : ''}`}>
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
    </div>
  );
}
