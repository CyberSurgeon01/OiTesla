"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DriverDashboard() {
  const [user, setUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activePools, setActivePools] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();

  const fetchPools = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/driver/pools`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const pools = await res.json();
        setActivePools(pools);
        
        // Update online status implicitly based on whether we get a valid response for vehicle,
        // but it's cleaner to fetch driver vehicle status directly. We'll derive it if a pool exists,
        // or just rely on toggle state. Since we don't have a GET /status endpoint, 
        // we assume the vehicle status from the pool's vehicle if available.
        if (pools.length > 0 && pools[0].vehicle) {
          setIsOnline(pools[0].vehicle.status === 'ONLINE');
        }
      }
    } catch (e) {
      console.error(e);
      setError('Failed to load active pools.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (token: string) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/driver/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setHistory(await res.json());
    } catch (e) {
      console.error(e);
      setError('Failed to load history.');
    } finally {
      setHistoryLoading(false);
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
    fetchHistory(token);
    
    const interval = setInterval(() => fetchPools(token), 5000);
    return () => clearInterval(interval);
  }, [router]);

  const toggleOnline = async () => {
    const token = localStorage.getItem('token');
    const newStatus = isOnline ? 'OFFLINE' : 'ONLINE';
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/driver/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) setIsOnline(!isOnline);
      else throw new Error();
    } catch (e) {
      setError('Failed to update status');
    }
  };

  const transitionPool = async (poolId: number, status: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/driver/pools/${poolId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchPools(token as string);
        if (status === 'COMPLETED') fetchHistory(token as string);
        setError('');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to transition');
      }
    } catch (e) {
      setError('Failed to transition pool.');
    }
  };

  if (!user || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20vh' }}>
        <h2>Loading Driver Dashboard...</h2>
      </div>
    );
  }

  // Derived state for UI separation
  const activeAndNotCancelled = (ride: any) => ride.status !== 'CANCELLED' && ride.status !== 'COMPLETED';
  
  const pendingPools = activePools.filter(p => 
    p.rideRequests.some((r: any) => activeAndNotCancelled(r) && (r.status === 'REQUESTED' || r.status === 'MATCHED'))
  );
  
  const inProgressPools = activePools.filter(p => 
    p.rideRequests.some((r: any) => activeAndNotCancelled(r) && ['ACCEPTED', 'DRIVER_ARRIVED', 'STARTED'].includes(r.status))
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Driver Dashboard</h1>
          <p style={{ margin: 0, color: 'gray' }}>Hello, {user.name} | TeslaPay Balance: {user.wallet_balance ? (user.wallet_balance / 100).toFixed(2) : 0} BDT</p>
        </div>
        <button 
          onClick={() => { localStorage.clear(); router.push('/login'); }} 
          style={{ padding: '0.5rem 1rem', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>

      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Online/Offline Toggle Panel */}
      <div style={{ 
        background: isOnline ? '#e8f5e9' : '#fafafa', 
        border: `1px solid ${isOnline ? '#4caf50' : '#ddd'}`,
        padding: '1.5rem', 
        borderRadius: '8px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ margin: 0 }}>Vehicle Status</h2>
          <p style={{ margin: 0, color: isOnline ? '#2e7d32' : 'gray' }}>
            {isOnline ? 'You are ONLINE and receiving requests.' : 'You are OFFLINE.'}
          </p>
        </div>
        <button 
          onClick={toggleOnline} 
          style={{ 
            padding: '0.75rem 1.5rem', 
            fontSize: '1rem', 
            fontWeight: 'bold',
            background: isOnline ? '#f44336' : '#4caf50', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          {isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      {/* Incoming Requests Panel */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '0.5rem' }}>Incoming Requests</h2>
        {pendingPools.length === 0 ? (
          <p style={{ color: 'gray', fontStyle: 'italic' }}>No incoming requests right now.</p>
        ) : (
          pendingPools.map(pool => {
            const activeRides = pool.rideRequests.filter(activeAndNotCancelled);
            const seatsUsed = activeRides.reduce((acc: number, r: any) => acc + r.seats_requested, 0);
            
            return (
              <div key={pool.id} style={{ border: '1px solid #2196f3', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', background: '#e3f2fd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#1565c0' }}>New Pool Assignment</h3>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>Seats: {seatsUsed} / {pool.vehicle.seat_capacity}</p>
                  </div>
                  <button 
                    onClick={() => transitionPool(pool.id, 'ACCEPTED')}
                    style={{ background: '#1976d2', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Accept Pool
                  </button>
                </div>
                
                <hr style={{ borderColor: '#bbdefb', margin: '1rem 0' }} />
                
                {activeRides.map((ride: any) => (
                  <div key={ride.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>👤 {ride.passenger.name} ({ride.seats_requested} seat)</span>
                    <span>📍 {ride.pickup_zone} ➡️ {ride.destination_zone}</span>
                    <span style={{ fontWeight: 'bold' }}>💵 {ride.fare_amount / 100} BDT ({ride.payment_method})</span>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Active Ride Panel */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '0.5rem' }}>Active Ride</h2>
        {inProgressPools.length === 0 ? (
          <p style={{ color: 'gray', fontStyle: 'italic' }}>No ride currently in progress.</p>
        ) : (
          inProgressPools.map(pool => {
            const activeRides = pool.rideRequests.filter(activeAndNotCancelled);
            const seatsUsed = activeRides.reduce((acc: number, r: any) => acc + r.seats_requested, 0);
            // Derive current state from the first active ride
            const currentState = activeRides[0]?.status;

            return (
              <div key={pool.id} style={{ border: '2px solid #4caf50', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: '#2e7d32' }}>Trip in Progress ({currentState})</h3>
                  <div style={{ background: '#e8f5e9', padding: '0.25rem 0.75rem', borderRadius: '16px', fontWeight: 'bold', color: '#2e7d32' }}>
                    Seats: {seatsUsed} / {pool.vehicle.seat_capacity}
                  </div>
                </div>

                {activeRides.map((ride: any) => (
                  <div key={ride.id} style={{ padding: '0.5rem', background: '#f5f5f5', borderRadius: '4px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>👤 {ride.passenger.name}</span>
                    <span>📍 {ride.pickup_zone} ➡️ {ride.destination_zone}</span>
                    <span style={{ fontWeight: 'bold' }}>💵 {ride.fare_amount / 100} BDT ({ride.payment_method})</span>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  {currentState === 'ACCEPTED' && (
                    <button 
                      onClick={() => transitionPool(pool.id, 'DRIVER_ARRIVED')}
                      style={{ flex: 1, background: '#ff9800', color: 'white', border: 'none', padding: '1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}
                    >
                      I have arrived
                    </button>
                  )}
                  {currentState === 'DRIVER_ARRIVED' && (
                    <button 
                      onClick={() => transitionPool(pool.id, 'STARTED')}
                      style={{ flex: 1, background: '#2196f3', color: 'white', border: 'none', padding: '1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}
                    >
                      Start Trip
                    </button>
                  )}
                  {currentState === 'STARTED' && (
                    <button 
                      onClick={() => transitionPool(pool.id, 'COMPLETED')}
                      style={{ flex: 1, background: '#4caf50', color: 'white', border: 'none', padding: '1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}
                    >
                      Complete Trip
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ride History Panel */}
      <div>
        <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '0.5rem' }}>Ride History</h2>
        {historyLoading ? <p>Loading history...</p> : history.length === 0 ? (
          <p style={{ color: 'gray', fontStyle: 'italic' }}>No completed trips yet.</p>
        ) : (
          history.map(pool => (
            <div key={pool.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'gray', fontSize: '0.9rem' }}>
                <span>Completed: {new Date(pool.updatedAt).toLocaleString()}</span>
                <span>Pool #{pool.id}</span>
              </div>
              {pool.rideRequests.map((ride: any) => (
                <div key={ride.id} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f5f5f5', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <span>{ride.passenger.name}</span>
                  <span>{ride.pickup_zone} ➡️ {ride.destination_zone}</span>
                  <span style={{ fontWeight: 'bold' }}>{ride.fare_amount / 100} BDT</span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

    </div>
  );
}
