"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, ChevronLeft, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PassengerHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    const fetchHistory = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/passenger/rides/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Sort most recent first
          data.sort((a: any, b: any) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
          setHistory(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar userRole="PASSENGER" userName="History" />
      
      <main className="flex-1 p-4 md:p-6 lg:p-8 flex justify-center">
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost" size="icon" className="-ml-2">
              <Link href="/passenger/dashboard">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">Ride History</h1>
          </div>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 flex flex-col items-center text-center text-muted-foreground mt-8">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 opacity-50" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No past rides</h3>
              <p>You haven't taken any trips yet.</p>
              <Button asChild variant="outline" className="mt-6">
                <Link href="/passenger/dashboard">Request a Ride</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map(ride => {
                const isCompleted = ride.status === 'COMPLETED';
                const isCancelled = ride.status === 'CANCELLED';
                
                return (
                  <Card key={ride.id} className="overflow-hidden hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-base sm:text-lg">
                            {ride.pickup_zone} → {ride.destination_zone}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(ride.requested_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">৳{(ride.fare_amount / 100).toFixed(2)}</div>
                          <div className={cn(
                            "text-xs font-medium uppercase tracking-wider mt-1",
                            isCompleted ? "text-success" : isCancelled ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {ride.status}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-4 border-t">
                        <div className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                          {ride.payment_method}
                        </div>
                        <div className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                          {ride.seats_requested} Seat{ride.seats_requested > 1 ? 's' : ''}
                        </div>
                        {ride.pool && (
                          <div className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                            Vehicle: {ride.pool.vehicle.name}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
