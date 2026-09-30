"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { readStoredUser } from '@/lib/session';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Minus, Plus, Car, AlertCircle, ChevronDown, Check, 
  Search, Wallet, Clock, LogOut, ArrowRight, X, User, Navigation, ArrowRightLeft
} from 'lucide-react';

import { ZONES } from '@/lib/pooling/geography';
import { fareBreakdown } from '@/lib/fare/fare.calculator';
import { readApiResponse } from '@/lib/api-response';
const STEPS = ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED'];

function calculateFarePreview(pickup: string, dest: string, seats: number = 1) {
  if (pickup === dest) return null;
  const fare = fareBreakdown(pickup, dest, seats);
  return { ...fare, baseFare: fare.baseFare / 100, distanceCharge: fare.distanceCharge / 100,
    farePerSeat: fare.farePerSeat / 100, total: fare.total / 100 };
}

// Custom Searchable Dropdown component replacing Pill grids
function SearchableRouteSelect({ value, onChange, options, placeholder }: { value: string, onChange: (v: string) => void, options: string[], placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div 
        className="flex items-center w-full bg-[#1E2621] border border-[#2C3831] p-3.5 rounded-xl cursor-pointer hover:bg-[#1A211D] transition-colors"
        onClick={() => { setOpen(!open); setQuery(""); }}
      >
        <span className={`flex-1 text-sm font-semibold ${value ? 'text-[#F3F4F6]' : 'text-[#6B7280]'}`}>{value || placeholder}</span>
        <ChevronDown className="w-4 h-4 text-[#6B7280]" />
      </div>
      
      {open && (
        <div className="absolute top-[110%] left-0 w-full bg-[#0A0D0B] border border-[#2C3831] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden backdrop-blur-2xl">
          <div className="p-3 border-b border-[#2C3831] flex items-center bg-[#0A0D0B]">
            <Search className="w-4 h-4 text-[#6B7280] mr-2" />
            <input 
              type="text" 
              className="bg-transparent border-none outline-none text-sm text-[#F3F4F6] w-full placeholder-gray-600"
              placeholder="Search zone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#2C3831]">
            {filtered.length > 0 ? filtered.map(opt => (
              <div 
                key={opt}
                className="px-4 py-3 text-sm hover:bg-[#1E2621] hover:text-[#F3F4F6] rounded-lg cursor-pointer text-[#D1D5DB] transition-colors flex items-center justify-between"
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                {opt}
                {value === opt && <Check className="w-4 h-4 text-[#10B981]" />}
              </div>
            )) : (
              <div className="px-4 py-3 text-sm text-[#6B7280] text-center">No zones found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PassengerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const previousStatusRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [completedRideToRate, setCompletedRideToRate] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  
  const [pickup, setPickup] = useState(ZONES[0]);
  const [destination, setDestination] = useState(ZONES[1]);
  const [seats, setSeats] = useState(1);
  const [paymentMethod] = useState('CASH');
  
  const [isCalculating, setIsCalculating] = useState(false);
  const [farePreview, setFarePreview] = useState<any>(null);
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsCalculating(true);
    const timer = setTimeout(() => {
      setFarePreview(calculateFarePreview(pickup, destination, seats));
      setIsCalculating(false);
    }, 400); // 400ms simulate network delay
    return () => clearTimeout(timer);
  }, [pickup, destination, seats]);

  const checkRecentCompletedRide = async (token: string) => {
    try {
      const res = await fetch(`/api/passenger/rides/history`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const history = await res.json();
        if (history.length > 0) {
          const lastRide = history[0];
          if (lastRide.status === 'COMPLETED' && !lastRide.rating) {
            setCompletedRideToRate(lastRide);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActiveRide = async (token: string) => {
    try {
      const res = await fetch(`/api/passenger/rides/active`, {
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
        
        if (!data && previousStatusRef.current && ['STARTED', 'DRIVER_ARRIVED', 'ACCEPTED'].includes(previousStatusRef.current)) {
          toast({ title: "Trip Completed! 🎉", description: "You have arrived at your destination." });
          checkRecentCompletedRide(token);
        }
        
        setActiveRide(data);
        if (data && previousStatusRef.current && previousStatusRef.current !== data.status) {
          const status = data.status;
          if (status === 'ACCEPTED') toast({ title: "Ride Accepted! 🚙", description: "A driver is on the way to your pickup location." });
          else if (status === 'DRIVER_ARRIVED') toast({ title: "Driver Arrived! 📍", description: "Please meet your driver at the pickup point." });
          else if (status === 'STARTED') toast({ title: "Trip Started! 🛣️", description: "You are now on your way to the destination." });
          else if (status === 'COMPLETED') toast({ title: "Trip Completed! 🎉", description: "You have arrived at your destination." });
        }
        previousStatusRef.current = data ? data.status : null;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async () => {
    if (!completedRideToRate || rating === 0) return;
    setSubmittingRating(true);
    try {
      const res = await fetch(`/api/passenger/rides/${completedRideToRate.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ rating, comment: ratingComment })
      });
      if (res.ok) {
        toast({ title: "Thanks for your feedback! ⭐", description: "Your rating has been submitted." });
        setCompletedRideToRate(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingRating(false);
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
    if (parsedUser.role !== 'PASSENGER') {
      router.push('/driver/dashboard');
      return;
    }
    
    setUser(parsedUser);
    fetchActiveRide(token);
    checkRecentCompletedRide(token);

    const interval = setInterval(() => {
      fetchActiveRide(token);
    }, 1000);
    return () => clearInterval(interval);
  }, [router]);

  const requestRide = async () => {
    if (pickup === destination) return;
    
    setRequesting(true);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`/api/rides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pickup_zone: pickup, destination_zone: destination, seats_requested: seats, payment_method: paymentMethod })
      });
      
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to request ride');
      
      toast({ title: "Request Sent", description: "Finding the best route for you..." });
      fetchActiveRide(token as string);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  };

  const cancelRide = async () => {
    if (!activeRide) return;
    setCancelling(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/rides/${activeRide.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }
      if (res.ok) {
        setActiveRide(null);
      } else {
        const data = await res.json();
        toast({ title: "Failed to cancel", description: data.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setCancelling(false);
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

  const isRideActive = activeRide && activeRide.status !== 'CANCELLED';
  const canCancel = activeRide && ['REQUESTED', 'MATCHED', 'ACCEPTED', 'DRIVER_ARRIVED'].includes(activeRide.status);
  
  let currentStepIndex = 0;
  if (activeRide) {
    currentStepIndex = STEPS.indexOf(activeRide.status);
    if (currentStepIndex === -1) currentStepIndex = 0; 
  }

  return (
    <div className="min-h-screen bg-[#0A0D0B] text-[#F3F4F6] font-sans selection:bg-[#10B981]/30 pb-32 sm:pb-12">
      
      {/* Rating Popup */}
      {completedRideToRate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#131815] border border-[#2C3831] rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
            <h3 className="text-xl font-bold text-[#F3F4F6] text-center mb-2">Rate Your Trip</h3>
            <p className="text-sm text-[#A1A1AA] text-center mb-6">How was your ride from {completedRideToRate.pickup_zone}?</p>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  onClick={() => setRating(star)}
                  className={`text-4xl transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'text-[#2C3831]'}`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea 
              placeholder="Leave a comment (optional)..."
              value={ratingComment}
              onChange={e => setRatingComment(e.target.value)}
              className="w-full bg-[#0A0D0B] border border-[#2C3831] rounded-xl p-3 text-sm text-[#F3F4F6] placeholder-[#71717A] focus:outline-none focus:border-[#10B981] mb-6 resize-none h-24"
            />
            
            <div className="flex gap-3">
              <button 
                onClick={() => setCompletedRideToRate(null)}
                className="flex-1 py-3 rounded-xl font-semibold text-[#A1A1AA] hover:text-[#F3F4F6] hover:bg-[#1E2621] transition-colors"
              >
                Skip
              </button>
              <button 
                onClick={submitRating}
                disabled={rating === 0 || submittingRating}
                className="flex-1 py-3 rounded-xl bg-[#10B981] text-[#022C22] font-semibold transition-all hover:bg-[#059669] disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {submittingRating && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-[#0A0D0B]/90 backdrop-blur-xl border-b border-[#2C3831]">
        <div className="max-w-screen-xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#F3F4F6]" />
            <span className="font-bold text-lg tracking-tight">OiTesla</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-[#A1A1AA] hidden sm:block">{user.name}</span>
            <button onClick={logout} className="p-2 rounded-full hover:bg-[#131815] transition-colors text-[#A1A1AA] hover:text-[#F3F4F6]">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-6 mt-4 space-y-6">
        
        {!isRideActive ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-[#F3F4F6] mb-8 leading-tight">Where to?</h1>
            
            {/* Request Card */}
            <div className="bg-[#131815] border border-[#2C3831] rounded-3xl p-6 shadow-2xl backdrop-blur-sm">
              <div className="space-y-4 relative z-20">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-semibold text-[#F3F4F6] ml-1">Pickup zone</label>
                    <SearchableRouteSelect value={pickup} onChange={setPickup} options={ZONES} placeholder="Pickup Location" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-semibold text-[#F3F4F6] ml-1">Destination zone</label>
                    <SearchableRouteSelect value={destination} onChange={setDestination} options={ZONES} placeholder="Destination" />
                  </div>
                </div>
                
                <button 
                  onClick={() => { const temp = pickup; setPickup(destination); setDestination(temp); }}
                  className="flex items-center gap-2 text-sm font-medium text-[#F3F4F6] hover:text-[#10B981] transition-colors py-1 ml-1"
                >
                  <ArrowRightLeft className="w-4 h-4" /> Swap pickup and destination
                </button>
              </div>

              <div className="mt-8">
                <div className="text-sm font-semibold text-[#F3F4F6] mb-3 ml-1">Seats</div>
                <div className="flex gap-3">
                  {[1, 2, 3].map(num => (
                    <button
                      key={num}
                      onClick={() => setSeats(num)}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all border ${
                        seats === num 
                          ? 'bg-[#10B981] text-[#022C22] border-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                          : 'bg-[#0A0D0B] text-[#F3F4F6] border-[#2C3831] hover:border-[#10B981]/50'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#A1A1AA] mt-3 ml-1">Select up to 3 seats for yourself and your companions.</p>
              </div>

              {/* Fare Preview Box */}
              <div className="mt-8 border-t border-[#2C3831] pt-6 min-h-[220px] relative z-0 transition-all">
                {isCalculating ? (
                  <div className="flex flex-col items-center justify-center h-[200px] animate-pulse space-y-3">
                    <div className="h-6 w-24 bg-white/10 rounded-md" />
                    <div className="h-4 w-40 bg-[#0A0D0B] border border-[#2C3831] rounded-md" />
                  </div>
                ) : pickup === destination ? (
                  <div className="flex items-center justify-center h-[200px] text-red-400 gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Pickup and destination must differ</span>
                  </div>
                ) : farePreview ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[#F3F4F6] font-bold text-lg">Estimated fare</span>
                      <span className="text-[#10B981] font-bold text-xl">৳{(farePreview.total).toFixed(2)}</span>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between text-[#A1A1AA]">
                        <span>Base fare</span>
                        <span className="text-[#F3F4F6]">৳{(farePreview.baseFare).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[#A1A1AA]">
                        <span>Distance charge</span>
                        <span className="text-[#F3F4F6]">৳{(farePreview.distanceCharge).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[#A1A1AA]">
                        <span>Fare per seat</span>
                        <span className="text-[#F3F4F6]">৳{(farePreview.farePerSeat || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[#A1A1AA] border-t border-[#2C3831] pt-3">
                        <span>Final fare</span>
                        <span className="text-[#F3F4F6]">৳{(farePreview.farePerSeat || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-[#F3F4F6] pt-1 mt-1">
                        <span>Estimated total (BDT)</span>
                        <span className="text-[#10B981]">৳{(farePreview.total).toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-[#A1A1AA] mt-6 leading-relaxed">
                      Fares displayed are per seat. Enjoy a premium shared ride experience while keeping your travel costs low.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            
            {/* Recent Rides Glance */}
            <div className="pt-4 pb-12 sm:pb-0 relative z-0">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-semibold text-lg">Recent Rides</h3>
                <Link href="/passenger/history" className="text-sm font-medium text-[#F3F4F6] hover:text-[#A1A1AA] transition-colors flex items-center gap-1">
                  History <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="bg-[#131815] border border-[#2C3831] rounded-2xl p-5 flex items-center justify-between hover:bg-[#1A211D] transition-colors cursor-pointer">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-[#0A0D0B] border border-[#2C3831] flex items-center justify-center">
                     <Clock className="w-5 h-5 text-[#A1A1AA]" />
                   </div>
                   <div>
                     <div className="font-medium text-sm text-[#F3F4F6]">To Gulshan</div>
                     <div className="text-xs text-[#6B7280] mt-0.5">Completed • Oct 12</div>
                   </div>
                 </div>
                 <div className="font-semibold text-sm text-[#F3F4F6]">৳45.00</div>
              </div>
            </div>

            {/* Sticky Bottom Bar for Action */}
            <div className="fixed bottom-0 left-0 w-full p-4 sm:p-6 bg-gradient-to-t from-[#05050A] via-[#05050A]/90 to-transparent z-40">
              <div className="max-w-lg mx-auto">
                <button
                  onClick={requestRide}
                  disabled={requesting || pickup === destination || isCalculating}
                  className="w-full h-14 rounded-xl bg-[#F0FDF4] text-[#022C22] font-semibold text-lg transition-all duration-300 hover:bg-[#DCFCE7] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {requesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                  Book ride
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Ride Tracker View */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-[#F3F4F6] mb-8 leading-tight">Your Ride</h1>
            
            <div className="bg-[#131815] border border-[#2C3831] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
              {/* Route Summary */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#2C3831]">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    <div className="w-0.5 h-6 bg-[#1E2621] rounded-full" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
                  </div>
                  <div className="flex flex-col justify-between h-14">
                    <div className="font-semibold text-sm text-[#F3F4F6]">{activeRide.pickup_zone}</div>
                    <div className="font-semibold text-sm text-[#F3F4F6]">{activeRide.destination_zone}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#6B7280] uppercase tracking-wider mb-1 font-semibold">Fare</div>
                  <div className="text-xl font-bold text-[#F3F4F6]">৳{(activeRide.fare_amount / 100).toFixed(2)}</div>
                </div>
              </div>

              {/* Advanced Stepper */}
              <div className="mb-16 px-10 sm:px-12">
                <div className="relative h-5 flex items-center">
                  <div className="absolute left-0 right-0 h-0.5 bg-[#1E2621]" />
                  <div 
                    className="absolute left-0 h-0.5 bg-[#10B981] transition-all duration-700 ease-in-out" 
                    style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
                  />
                  
                  <div className="absolute left-0 right-0 flex justify-between">
                    {STEPS.map((step, index) => {
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
                          <span className={`absolute top-5 mt-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest w-24 transition-all duration-300 ${
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

              {/* Driver / Match Info Area */}
              <div className="mt-8 rounded-2xl bg-[#0A0D0B] border border-[#2C3831] p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#131815] border border-[#2C3831] flex items-center justify-center text-[#10B981]">
                  {currentStepIndex >= 1 ? <Car className="w-6 h-6" /> : <Search className="w-6 h-6 animate-pulse" />}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-[#F3F4F6]">
                    {currentStepIndex >= 1 ? 'Driver assigned' : 'Finding your driver...'}
                  </div>
                  <div className="text-xs text-[#A1A1AA] mt-1">
                    {currentStepIndex >= 1 ? 'Tesla Model S • Dark Blue' : 'Matching you with a pooled ride'}
                  </div>
                </div>
              </div>
              
              {/* Cancel Button */}
              {canCancel && (
                <div className="mt-8 pt-6 border-t border-[#2C3831]">
                  <button
                    onClick={cancelRide}
                    disabled={cancelling}
                    className="w-full h-12 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 font-semibold text-sm transition-all hover:bg-red-500/10 hover:border-red-500/50 flex items-center justify-center gap-2"
                  >
                    {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Cancel Ride
                  </button>
                  <p className="text-center text-xs text-[#6B7280] mt-3 font-medium">
                    No fee if cancelled before driver arrives
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
