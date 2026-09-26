"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Power, User, MapPin, CheckCircle, Navigation, Flag } from 'lucide-react';
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

  if (!user || loading) {
    return (
      <div className="flex h-screen flex-col">
        <TopBar userRole="DRIVER" userName="Loading..." />
        <main className="flex-1 p-6 flex flex-col items-center">
          <div className="w-full max-w-2xl space-y-4">
            <Skeleton className="h-[100px] w-full rounded-xl" />
            <Skeleton className="h-[200px] w-full rounded-xl" />
          </div>
        </main>
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar userRole="DRIVER" userName={user.name} />
      
      <main className="flex-1 p-4 md:p-6 lg:p-8 flex justify-center">
        <div className="w-full max-w-2xl space-y-6">
          
          <div className="flex items-center justify-between bg-card border rounded-xl p-4 shadow-sm">
            <div className="flex flex-col">
              <span className="font-semibold text-lg">Accepting Rides</span>
              <span className="text-sm text-muted-foreground">
                {isOnline ? "You're visible to passengers" : "Go online to start earning"}
              </span>
            </div>
            <button
              onClick={toggleOnline}
              disabled={statusLoading}
              className={cn(
                "relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                isOnline ? "bg-success" : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block h-6 w-6 rounded-full bg-background shadow-lg ring-0 transition-transform",
                  isOnline ? "translate-x-7" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">Incoming Requests</h2>
            {pendingPools.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                <Navigation className="mx-auto h-8 w-8 opacity-50 mb-3" />
                <p>No new requests</p>
              </div>
            ) : (
              pendingPools.map(pool => {
                const activeRides = pool.rideRequests.filter(activeAndNotCancelled);
                const seatsUsed = activeRides.reduce((acc: number, r: any) => acc + r.seats_requested, 0);
                
                return (
                  <Card key={pool.id} className="overflow-hidden border-electric/30 shadow-md">
                    <CardHeader className="bg-electric/5 pb-4">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base text-electric font-semibold">New Pool Assignment</CardTitle>
                        <div className="text-sm font-medium bg-background px-3 py-1 rounded-full border shadow-sm">
                          {seatsUsed} / {pool.vehicle.seat_capacity} Seats
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {activeRides.map((ride: any) => (
                          <div key={ride.id} className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center text-sm font-medium">
                                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                {ride.passenger.name} <span className="ml-2 text-muted-foreground">({ride.seats_requested} seat)</span>
                              </div>
                              <div className="flex items-center text-sm text-muted-foreground pl-6">
                                <span>{ride.pickup_zone}</span>
                                <span className="mx-2">→</span>
                                <span>{ride.destination_zone}</span>
                              </div>
                            </div>
                            <div className="font-semibold text-lg">
                              ৳{ride.fare_amount / 100}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 bg-muted/20">
                        <Button 
                          onClick={() => transitionPool(pool.id, 'ACCEPTED')}
                          disabled={actionLoading === pool.id}
                          className="w-full"
                          variant="electric"
                          size="lg"
                        >
                          {actionLoading === pool.id && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                          Accept Pool
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">Active Trip</h2>
            {inProgressPools.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                <MapPin className="mx-auto h-8 w-8 opacity-50 mb-3" />
                <p>No trip in progress</p>
              </div>
            ) : (
              inProgressPools.map(pool => {
                const activeRides = pool.rideRequests.filter(activeAndNotCancelled);
                const seatsUsed = activeRides.reduce((acc: number, r: any) => acc + r.seats_requested, 0);
                const currentState = activeRides[0]?.status;

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

                return (
                  <Card key={pool.id} className="overflow-hidden border-border shadow-sm">
                    <CardHeader className="bg-muted/30 pb-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                          <CardTitle className="text-base font-semibold">Live Trip <span className="text-muted-foreground font-normal ml-2 text-sm">({seatsUsed}/{pool.vehicle.seat_capacity} seats)</span></CardTitle>
                        </div>
                        <div className="flex space-x-1">
                          {Array.from({ length: pool.vehicle.seat_capacity }).map((_, i) => (
                            <div 
                              key={i} 
                              className={cn(
                                "h-2 w-2 rounded-full transition-colors",
                                i < seatsUsed ? "bg-primary" : "bg-muted"
                              )} 
                            />
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {activeRides.map((ride: any) => (
                          <div key={ride.id} className="p-4 flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{ride.passenger.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {ride.pickup_zone} → {ride.destination_zone}
                              </div>
                            </div>
                            <div className="font-medium bg-muted px-2 py-1 rounded text-sm">
                              ৳{ride.fare_amount / 100}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {nextState && (
                        <div className="p-4 bg-muted/20">
                          <Button 
                            onClick={() => transitionPool(pool.id, nextState)}
                            disabled={actionLoading === pool.id}
                            className="w-full"
                            size="lg"
                          >
                            {actionLoading === pool.id ? (
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                              <ButtonIcon className="mr-2 h-5 w-5" />
                            )}
                            {buttonLabel}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
