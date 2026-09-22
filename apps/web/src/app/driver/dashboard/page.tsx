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
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const activeAndNotCancelled = (ride: any) => ride.status !== 'CANCELLED' && ride.status !== 'COMPLETED';
  
  const pendingPools = activePools.filter(p => 
    p.rideRequests.some((r: any) => activeAndNotCancelled(r) && (r.status === 'REQUESTED' || r.status === 'MATCHED'))
  );
  
  const inProgressPools = activePools.filter(p => 
    p.rideRequests.some((r: any) => activeAndNotCancelled(r) && ['ACCEPTED', 'DRIVER_ARRIVED', 'STARTED'].includes(r.status))
  );

  return (
    <div className="page-container">
      
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <h1>Driver Dashboard</h1>
          <p>Hello, {user.name} 👋</p>
        </div>
        <div className="header-right">
          <div className="badge badge-muted" style={{ marginRight: '1rem', padding: '0.4rem 0.8rem' }}>
            Balance: {user.wallet_balance ? (user.wallet_balance / 100).toFixed(2) : 0} BDT
          </div>
          <button onClick={() => { localStorage.clear(); router.push('/login'); }} className="btn btn-ghost">
            Logout
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Online/Offline Toggle Panel */}
      <div className={`card ${isOnline ? 'card-green' : ''}`} style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Vehicle Status</h2>
          <p style={{ marginTop: '0.25rem', color: isOnline ? 'var(--green)' : 'var(--text-muted)' }}>
            {isOnline ? 'You are ONLINE and receiving requests.' : 'You are OFFLINE.'}
          </p>
        </div>
        <div className="toggle-wrapper" onClick={toggleOnline}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          <div className={`toggle-track ${isOnline ? 'active' : ''}`}>
            <div className="toggle-thumb"></div>
          </div>
        </div>
      </div>

      {/* Incoming Requests Panel */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 className="section-title">📡 Incoming Requests</h2>
        {pendingPools.length === 0 ? (
          <div className="empty-state">
            <div className="icon">💤</div>
            <p>No incoming requests right now.</p>
          </div>
        ) : (
          pendingPools.map(pool => {
            const activeRides = pool.rideRequests.filter(activeAndNotCancelled);
            const seatsUsed = activeRides.reduce((acc: number, r: any) => acc + r.seats_requested, 0);
            
            return (
              <div key={pool.id} className="card card-blue" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ color: 'var(--blue)' }}>New Pool Assignment</h3>
                    <div style={{ marginTop: '0.5rem', fontWeight: '500' }}>
                      Seats Filled: <span style={{ color: 'white' }}>{seatsUsed} / {pool.vehicle.seat_capacity}</span>
                    </div>
                  </div>
                  <button onClick={() => transitionPool(pool.id, 'ACCEPTED')} className="btn btn-blue">
                    Accept Pool
                  </button>
                </div>
                
                <hr className="divider" />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeRides.map((ride: any) => (
                    <div key={ride.id} className="ride-row">
                      <div className="route">
                        <span>👤 {ride.passenger.name} ({ride.seats_requested} seat)</span>
                        <span style={{ margin: '0 0.5rem', opacity: 0.3 }}>|</span>
                        <span>📍 {ride.pickup_zone} ➡️ {ride.destination_zone}</span>
                      </div>
                      <div className="fare">{ride.fare_amount / 100} BDT</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Active Ride Panel */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 className="section-title">🚀 Active Trip</h2>
        {inProgressPools.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🛣️</div>
            <p>No trip currently in progress.</p>
          </div>
        ) : (
          inProgressPools.map(pool => {
            const activeRides = pool.rideRequests.filter(activeAndNotCancelled);
            const seatsUsed = activeRides.reduce((acc: number, r: any) => acc + r.seats_requested, 0);
            const currentState = activeRides[0]?.status;

            return (
              <div key={pool.id} className="card card-accent" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3>Trip in Progress</h3>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span className="badge badge-blue">Seats: {seatsUsed} / {pool.vehicle.seat_capacity}</span>
                    <span className="badge badge-green">{currentState}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                  {activeRides.map((ride: any) => (
                    <div key={ride.id} className="ride-row">
                      <div className="route">
                        <span>👤 {ride.passenger.name}</span>
                        <span style={{ margin: '0 0.5rem', opacity: 0.3 }}>|</span>
                        <span>📍 {ride.pickup_zone} ➡️ {ride.destination_zone}</span>
                      </div>
                      <div className="fare">{ride.fare_amount / 100} BDT</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  {currentState === 'ACCEPTED' && (
                    <button onClick={() => transitionPool(pool.id, 'DRIVER_ARRIVED')} className="btn btn-orange btn-lg">
                      I have arrived
                    </button>
                  )}
                  {currentState === 'DRIVER_ARRIVED' && (
                    <button onClick={() => transitionPool(pool.id, 'STARTED')} className="btn btn-blue btn-lg">
                      Start Trip
                    </button>
                  )}
                  {currentState === 'STARTED' && (
                    <button onClick={() => transitionPool(pool.id, 'COMPLETED')} className="btn btn-green btn-lg">
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
        <h2 className="section-title">📋 Recent History</h2>
        {historyLoading ? <div className="loading"><div className="spinner"></div></div> : history.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📁</div>
            <p>No completed trips yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {history.map(pool => (
              <div key={pool.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: '600' }}>Pool #{pool.id}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{new Date(pool.updatedAt).toLocaleDateString()}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {pool.rideRequests.map((ride: any) => (
                    <div key={ride.id} className="ride-row" style={{ background: 'var(--bg)' }}>
                      <div className="route">
                        <span>{ride.passenger.name}</span>
                        <span style={{ margin: '0 0.5rem', opacity: 0.3 }}>|</span>
                        <span>{ride.pickup_zone} ➡️ {ride.destination_zone}</span>
                      </div>
                      <div className="fare" style={{ color: 'var(--text)' }}>{ride.fare_amount / 100} BDT</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
