"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TopBar } from '@/components/TopBar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Minus, Plus, MapPin, Navigation, Car, AlertCircle, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ZONES = ['Banani', 'Gulshan', 'Mohakhali', 'Dhanmondi', 'Mirpur', 'Uttara', 'Farmgate', 'Bashundhara'];

const STEPS = ['REQUESTED', 'MATCHED', 'ACCEPTED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED'];

const DISTANCE_MAP: Record<string, Record<string, number>> = {
  'Banani': { 'Mohakhali': 2, 'Gulshan': 3, 'Farmgate': 5, 'Dhanmondi': 8 },
  'Gulshan': { 'Mohakhali': 3, 'Bashundhara': 6, 'Banani': 3 },
  'Mohakhali': { 'Farmgate': 3, 'Gulshan': 3, 'Banani': 2 },
  'Farmgate': { 'Dhanmondi': 3, 'Mohakhali': 3, 'Banani': 5 },
  'Dhanmondi': { 'Farmgate': 3, 'Banani': 8 }
};

function calculateFarePreview(pickup: string, dest: string, seats: number) {
  if (pickup === dest) return null;
  const distanceKm = DISTANCE_MAP[pickup]?.[dest] || 5;
  const baseFare = 30; // BDT
  const distanceCharge = distanceKm * 15;
  const poolDiscount = 10;
  
  // Base fare is per ride, but let's assume the backend calculates per ride, not per seat (wait, backend doesn't multiply by seats? Let's check backend... The backend didn't multiply by seats_requested in the file! It's flat per passenger group). Let's assume flat.
  let fare = baseFare + distanceCharge - poolDiscount;
  if (fare < 20) fare = 20;
  
  return {
    baseFare,
    distanceCharge,
    distanceKm,
    poolDiscount,
    total: fare
  };
}

function ZoneChips({ value, onChange, label }: { value: string, onChange: (v: string) => void, label: string }) {
  return (
    <div className="space-y-3">
      <Label className="text-sm text-muted-foreground uppercase tracking-wider">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {ZONES.map(z => (
          <button
            key={z}
            type="button"
            onClick={() => onChange(z)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
              value === z 
                ? "bg-electric text-white border-electric shadow-md" 
                : "bg-background text-foreground border-border hover:border-electric/50 hover:bg-muted"
            )}
          >
            {value === z && <Check className="inline-block mr-1 h-3 w-3" />}
            {z}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PassengerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showFareBreakdown, setShowFareBreakdown] = useState(false);
  
  // Form State
  const [pickup, setPickup] = useState(ZONES[0]);
  const [destination, setDestination] = useState(ZONES[1]);
  const [seats, setSeats] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  
  const router = useRouter();
  const { toast } = useToast();

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

  const requestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pickup === destination) {
      toast({ title: "Invalid Route", description: "Pickup and destination cannot be the same.", variant: "destructive" });
      return;
    }
    
    setRequesting(true);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/rides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pickup_zone: pickup,
          destination_zone: destination,
          seats_requested: seats,
          payment_method: paymentMethod
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request ride');
      
      toast({ title: "Ride Requested", description: "Looking for a driver..." });
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
        toast({ title: "Ride Cancelled" });
        setActiveRide(null);
      } else {
        const data = await res.json();
        toast({ title: "Failed to cancel", description: data.error, variant: "destructive" });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="flex h-screen flex-col">
        <TopBar userRole="PASSENGER" userName="Loading..." />
        <main className="flex-1 p-6 flex flex-col items-center">
          <div className="w-full max-w-xl space-y-4">
            <Skeleton className="h-10 w-[200px]" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  const canCancel = activeRide && ['REQUESTED', 'MATCHED', 'ACCEPTED', 'DRIVER_ARRIVED'].includes(activeRide.status);
  const isCancelled = activeRide?.status === 'CANCELLED';
  const currentStepIndex = activeRide ? STEPS.indexOf(activeRide.status) : -1;
  const farePreview = calculateFarePreview(pickup, destination, seats);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar userRole="PASSENGER" userName={user.name} />
      
      <main className="flex-1 p-4 md:p-6 lg:p-8 flex justify-center">
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <Button asChild variant="outline" size="sm">
              <Link href="/passenger/history">Ride History</Link>
            </Button>
          </div>

          {!activeRide ? (
            <Card className="overflow-hidden shadow-sm">
              <CardHeader className="bg-muted/30 border-b pb-6">
                <CardTitle className="text-xl">Request a Ride</CardTitle>
                <CardDescription>Select your zones to find a shared Tesla</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form id="ride-form" onSubmit={requestRide} className="space-y-8">
                  <div className="space-y-6 relative">
                    <ZoneChips label="Pickup Location" value={pickup} onChange={setPickup} />
                    
                    <div className="absolute left-4 top-16 bottom-16 w-0.5 bg-border -z-10 hidden sm:block" />
                    
                    <ZoneChips label="Destination" value={destination} onChange={setDestination} />
                  </div>

                  <hr className="border-border" />

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground uppercase tracking-wider">Passengers</Label>
                      <div className="flex items-center space-x-4 bg-muted/30 p-2 rounded-lg border">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 rounded-full"
                          onClick={() => setSeats(Math.max(1, seats - 1))}
                          disabled={seats <= 1 || requesting}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-lg font-medium w-8 text-center">{seats}</span>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 rounded-full"
                          onClick={() => setSeats(Math.min(3, seats + 1))}
                          disabled={seats >= 3 || requesting}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground uppercase tracking-wider">Payment</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={requesting}>
                        <SelectTrigger className="bg-muted/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="TESLA_PAY">TeslaPay Wallet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Fare Preview */}
                  {farePreview ? (
                    <div className="mt-4 rounded-xl bg-electric/5 border border-electric/20 p-4">
                      <div className="flex justify-between items-end mb-4">
                        <div>
                          <h4 className="font-semibold text-electric">Estimated Fare</h4>
                          <p className="text-sm text-muted-foreground">For {seats} seat{seats > 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-3xl font-bold text-electric tracking-tight">৳{farePreview.total.toFixed(2)}</div>
                      </div>
                      
                      <div className="space-y-2 text-sm border-t border-electric/10 pt-3">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Base Fare</span>
                          <span>৳{farePreview.baseFare.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Distance ({farePreview.distanceKm} km)</span>
                          <span>৳{farePreview.distanceCharge.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-success font-medium">
                          <span>Pool Discount</span>
                          <span>- ৳{farePreview.poolDiscount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                     <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-destructive flex items-center">
                       <AlertCircle className="mr-2 h-5 w-5" />
                       Pickup and destination must be different.
                     </div>
                  )}

                </form>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t p-6">
                <Button 
                  type="submit" 
                  form="ride-form" 
                  className="w-full font-semibold" 
                  size="lg" 
                  variant="electric"
                  disabled={requesting || pickup === destination}
                >
                  {requesting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Confirm Request
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className={cn(
              "overflow-hidden transition-all duration-300",
              isCancelled ? "border-destructive/50" : "border-electric/50 shadow-md shadow-electric/10"
            )}>
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center">
                    <Car className="mr-2 h-5 w-5 text-electric" /> 
                    Ride Status
                  </CardTitle>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold tracking-wide",
                    isCancelled ? "bg-destructive/10 text-destructive" : "bg-electric/10 text-electric"
                  )}>
                    {activeRide.status.replace('_', ' ')}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-electric" />
                      <div className="h-10 w-0.5 bg-border" />
                      <div className="h-3 w-3 rounded-full border-2 border-electric bg-background" />
                    </div>
                    <div className="flex flex-col h-[68px] justify-between">
                      <div className="font-medium">{activeRide.pickup_zone}</div>
                      <div className="font-medium">{activeRide.destination_zone}</div>
                    </div>
                  </div>

                  {/* Stepper */}
                  {!isCancelled && (
                    <div className="mb-8">
                      <div className="relative">
                        <div className="absolute left-0 top-1/2 w-full -translate-y-1/2 border-t-2 border-muted" />
                        <div className="relative flex justify-between">
                          {STEPS.map((step, index) => {
                            const isActive = index === currentStepIndex;
                            const isPast = index < currentStepIndex;
                            return (
                              <div key={step} className="flex flex-col items-center">
                                <div className={cn(
                                  "h-4 w-4 rounded-full border-2 z-10 bg-background transition-colors duration-300",
                                  isPast ? "border-electric bg-electric" : 
                                  isActive ? "border-electric animate-pulse-subtle shadow-[0_0_0_4px_rgba(37,99,235,0.2)]" : "border-muted"
                                )} />
                                <span className={cn(
                                  "mt-2 text-[10px] sm:text-xs font-medium uppercase tracking-wider absolute -bottom-6 text-center w-20 -ml-8",
                                  (isActive || isPast) ? "text-foreground" : "text-muted-foreground opacity-50"
                                )}>
                                  {step.replace('_', ' ')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="mb-8 flex items-center justify-center p-4 bg-destructive/5 rounded-lg text-destructive">
                      <AlertCircle className="mr-2 h-5 w-5" />
                      <span className="font-medium">This ride was cancelled</span>
                    </div>
                  )}

                  {/* Fare */}
                  <div className="mt-12 rounded-xl bg-muted/50 p-4 border border-border">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowFareBreakdown(!showFareBreakdown)}>
                      <div>
                        <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Estimated Fare</div>
                        <div className="text-3xl font-bold tracking-tight mt-1">৳{(activeRide.fare_amount / 100).toFixed(2)}</div>
                      </div>
                      <Button variant="ghost" size="icon" className="hover:bg-muted">
                        {showFareBreakdown ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </Button>
                    </div>
                    
                    {showFareBreakdown && (
                      <div className="mt-4 pt-4 border-t space-y-2 text-sm animate-accordion-down">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Seats</span>
                          <span className="font-medium">{activeRide.seats_requested}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Payment</span>
                          <span className="font-medium">{activeRide.payment_method}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              {canCancel && (
                <CardFooter className="bg-muted/30 p-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                    onClick={cancelRide}
                    disabled={cancelling}
                  >
                    {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cancel Ride
                  </Button>
                </CardFooter>
              )}
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
