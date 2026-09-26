"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Minus, Plus, Car, AlertCircle, ChevronDown, Check, 
  Search, Wallet, Clock, LogOut, ArrowRight, X, User, Navigation
} from 'lucide-react';

const ZONES = ['Banani', 'Gulshan', 'Mohakhali', 'Dhanmondi', 'Mirpur', 'Uttara', 'Farmgate', 'Bashundhara'];
const STEPS = ['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED'];

const DISTANCE_MAP: Record<string, Record<string, number>> = {
  'Banani': { 'Mohakhali': 2, 'Gulshan': 3, 'Farmgate': 5, 'Dhanmondi': 8, 'Mirpur': 7, 'Uttara': 9, 'Bashundhara': 6 },
  'Gulshan': { 'Mohakhali': 3, 'Bashundhara': 6, 'Banani': 3, 'Dhanmondi': 9 },
  'Mohakhali': { 'Farmgate': 3, 'Gulshan': 3, 'Banani': 2, 'Dhanmondi': 6 },
  'Farmgate': { 'Dhanmondi': 3, 'Mohakhali': 3, 'Banani': 5 },
  'Dhanmondi': { 'Farmgate': 3, 'Banani': 8, 'Gulshan': 9, 'Mohakhali': 6 }
};

function calculateFarePreview(pickup: string, dest: string, seats: number) {
  if (pickup === dest) return null;
  const distanceKm = DISTANCE_MAP[pickup]?.[dest] || 5;
  const baseFare = 30; 
  const distanceCharge = distanceKm * 15;
  const poolDiscount = 10;
  
  let fare = baseFare + distanceCharge - poolDiscount;
  if (fare < 20) fare = 20;
  
  return { baseFare, distanceCharge, distanceKm, poolDiscount, total: fare };
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
        className="flex items-center w-full bg-white/[0.03] border border-white/10 p-3.5 rounded-xl cursor-pointer hover:bg-white/[0.06] transition-colors"
        onClick={() => { setOpen(!open); setQuery(""); }}
      >
        <span className={`flex-1 text-sm font-semibold ${value ? 'text-white' : 'text-gray-500'}`}>{value || placeholder}</span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </div>
      
      {open && (
        <div className="absolute top-[110%] left-0 w-full bg-[#0F0F1A] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden backdrop-blur-2xl">
          <div className="p-3 border-b border-white/5 flex items-center bg-black/40">
            <Search className="w-4 h-4 text-gray-500 mr-2" />
            <input 
              type="text" 
              className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-gray-600"
              placeholder="Search zone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
            {filtered.length > 0 ? filtered.map(opt => (
              <div 
                key={opt}
                className="px-4 py-3 text-sm hover:bg-[#4F6BFF]/20 hover:text-white rounded-lg cursor-pointer text-gray-300 transition-colors flex items-center justify-between"
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                {opt}
                {value === opt && <Check className="w-4 h-4 text-[#4F6BFF]" />}
              </div>
            )) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">No zones found</div>
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
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  
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

  const fetchActiveRide = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/passenger/rides/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRide(data);
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
    if (parsedUser.role !== 'PASSENGER') {
      router.push('/driver/dashboard');
      return;
    }
    
    setUser(parsedUser);
    fetchActiveRide(token);

    const interval = setInterval(() => {
      fetchActiveRide(token);
    }, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const requestRide = async () => {
    if (pickup === destination) return;
    
    setRequesting(true);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/rides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pickup_zone: pickup, destination_zone: destination, seats_requested: seats, payment_method: paymentMethod })
      });
      
      const data = await res.json();
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/rides/${activeRide.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
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
      <div className="min-h-screen bg-[#05050A] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#4F6BFF] animate-spin mb-4" />
        <div className="text-gray-400 font-medium">Loading your dashboard...</div>
      </div>
    );
  }

  const isRideActive = activeRide && activeRide.status !== 'CANCELLED';
  const canCancel = activeRide && ['REQUESTED', 'MATCHED'].includes(activeRide.status);
  
  let currentStepIndex = 0;
  if (activeRide) {
    currentStepIndex = STEPS.indexOf(activeRide.status);
    if (currentStepIndex === -1) currentStepIndex = 0; 
  }

  return (
    <div className="min-h-screen bg-[#05050A] text-white font-sans selection:bg-[#4F6BFF]/30 pb-32 sm:pb-12">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-[#05050A]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-screen-xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#4F6BFF] shadow-[0_0_10px_rgba(79,107,255,0.8)]" />
            <span className="font-bold text-lg tracking-tight">OiTesla</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-400 hidden sm:block">{user.name}</span>
            <button onClick={logout} className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-6 mt-4 space-y-6">
        
        {!isRideActive ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold tracking-tight mb-6">Where to?</h2>
            
            {/* Request Card */}
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-sm">
              
              {/* Route Picker */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center mt-5 mb-5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  <div className="w-0.5 flex-1 bg-gradient-to-b from-white/20 to-[#4F6BFF]/50 my-1 rounded-full" />
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#4F6BFF] shadow-[0_0_8px_rgba(79,107,255,0.8)]" />
                </div>
                <div className="flex-1 space-y-3 relative z-20">
                  <SearchableRouteSelect value={pickup} onChange={setPickup} options={ZONES} placeholder="Pickup Location" />
                  <SearchableRouteSelect value={destination} onChange={setDestination} options={ZONES} placeholder="Destination" />
                </div>
              </div>

              {/* Options Row */}
              <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#4F6BFF]/10 text-[#4F6BFF]">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Seats</div>
                    <div className="flex items-center gap-3 bg-white/5 rounded-full px-3 py-1 border border-white/5">
                      <button 
                        onClick={() => setSeats(Math.max(1, seats - 1))}
                        disabled={seats <= 1}
                        className="text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-semibold text-sm w-4 text-center">{seats}</span>
                      <button 
                        onClick={() => setSeats(Math.min(4, seats + 1))}
                        disabled={seats >= 4}
                        className="text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 text-gray-300">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Payment</div>
                    <div className="text-sm font-semibold text-white">Cash</div>
                  </div>
                </div>
              </div>

              {/* Fare Preview Box */}
              <div className="mt-6 rounded-2xl bg-black/40 border border-white/5 p-5 min-h-[120px] flex flex-col justify-center relative z-0 transition-all">
                {isCalculating ? (
                  <div className="flex flex-col items-center justify-center animate-pulse space-y-3">
                    <div className="h-6 w-24 bg-white/10 rounded-md" />
                    <div className="h-4 w-40 bg-white/5 rounded-md" />
                  </div>
                ) : pickup === destination ? (
                  <div className="flex items-center justify-center text-red-400 gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Pickup and destination must differ</span>
                  </div>
                ) : farePreview ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-gray-400 text-sm font-medium">Estimated Fare</span>
                      <span className="text-3xl font-bold tracking-tight text-white">৳{farePreview.total.toFixed(2)}</span>
                    </div>
                    {farePreview.poolDiscount > 0 && (
                      <div className="rounded-lg bg-[#4F6BFF]/10 border border-[#4F6BFF]/20 p-2.5 flex items-start gap-2">
                        <Car className="w-4 h-4 text-[#4F6BFF] mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-[#a5b6ff] leading-relaxed">
                          Includes ৳{farePreview.poolDiscount} discount. Pooled with up to {4 - seats} riders going your way.
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            
            {/* Recent Rides Glance */}
            <div className="pt-4 pb-12 sm:pb-0 relative z-0">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-semibold text-lg">Recent Rides</h3>
                <Link href="/passenger/history" className="text-sm font-medium text-[#4F6BFF] hover:text-white transition-colors flex items-center gap-1">
                  History <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                     <Clock className="w-5 h-5 text-gray-400" />
                   </div>
                   <div>
                     <div className="font-medium text-sm text-white">To Gulshan</div>
                     <div className="text-xs text-gray-500 mt-0.5">Completed • Oct 12</div>
                   </div>
                 </div>
                 <div className="font-semibold text-sm text-white">৳45.00</div>
              </div>
            </div>

            {/* Sticky Bottom Bar for Action */}
            <div className="fixed bottom-0 left-0 w-full p-4 sm:p-6 bg-gradient-to-t from-[#05050A] via-[#05050A]/90 to-transparent z-40">
              <div className="max-w-lg mx-auto">
                <button
                  onClick={requestRide}
                  disabled={requesting || pickup === destination || isCalculating}
                  className="w-full h-14 rounded-full bg-[#4F6BFF] text-white font-bold text-lg shadow-[0_0_20px_rgba(79,107,255,0.4)] transition-all duration-300 hover:bg-[#4F6BFF]/90 hover:shadow-[0_0_30px_rgba(79,107,255,0.6)] disabled:opacity-50 disabled:shadow-none hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2"
                >
                  {requesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                  Confirm Request
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Ride Tracker View */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Your Ride</h2>
            
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
              {/* Route Summary */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    <div className="w-0.5 h-6 bg-white/20 rounded-full" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-[#4F6BFF]" />
                  </div>
                  <div className="flex flex-col justify-between h-14">
                    <div className="font-semibold text-sm text-white">{activeRide.pickup_zone}</div>
                    <div className="font-semibold text-sm text-white">{activeRide.destination_zone}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Fare</div>
                  <div className="text-xl font-bold text-white">৳{(activeRide.fare_amount / 100).toFixed(2)}</div>
                </div>
              </div>

              {/* Advanced Stepper */}
              <div className="relative mb-14 px-2">
                <div className="absolute left-2 right-2 top-2.5 h-0.5 bg-white/10 rounded-full" />
                <div 
                  className="absolute left-2 top-2.5 h-0.5 bg-[#4F6BFF] rounded-full transition-all duration-700 ease-in-out" 
                  style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
                />
                
                <div className="relative flex justify-between">
                  {STEPS.map((step, index) => {
                    const isActive = index === currentStepIndex;
                    const isPast = index <= currentStepIndex;
                    
                    return (
                      <div key={step} className="flex flex-col items-center">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
                          isPast ? 'bg-[#4F6BFF] shadow-[0_0_10px_rgba(79,107,255,0.8)]' : 
                          isActive ? 'bg-[#4F6BFF] ring-4 ring-[#4F6BFF]/30 animate-pulse' : 'bg-[#1A1A24] border-2 border-white/10'
                        }`}>
                          {isPast && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className={`absolute mt-8 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest w-20 text-center -ml-10 transition-colors duration-300 ${
                          isActive ? 'text-white' : isPast ? 'text-[#4F6BFF]' : 'text-gray-600'
                        }`}>
                          {step.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Driver / Match Info Area */}
              <div className="mt-8 rounded-2xl bg-black/40 border border-white/5 p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#4F6BFF]/20 flex items-center justify-center text-[#4F6BFF]">
                  {currentStepIndex >= 1 ? <Car className="w-6 h-6" /> : <Search className="w-6 h-6 animate-pulse" />}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-white">
                    {currentStepIndex >= 1 ? 'Driver assigned' : 'Finding your driver...'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {currentStepIndex >= 1 ? 'Tesla Model S • Dark Blue' : 'Matching you with a pooled ride'}
                  </div>
                </div>
              </div>
              
              {/* Cancel Button */}
              {canCancel && (
                <div className="mt-8 pt-6 border-t border-white/5">
                  <button
                    onClick={cancelRide}
                    disabled={cancelling}
                    className="w-full h-12 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 font-semibold text-sm transition-all hover:bg-red-500/10 hover:border-red-500/50 flex items-center justify-center gap-2"
                  >
                    {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Cancel Ride
                  </button>
                  <p className="text-center text-xs text-gray-500 mt-3 font-medium">
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
