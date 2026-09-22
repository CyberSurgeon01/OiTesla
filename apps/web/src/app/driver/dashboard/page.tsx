"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DriverDashboard() {
  const [user, setUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activePools, setActivePools] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchPools = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/driver/pools`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setActivePools(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchHistory = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/driver/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setHistory(await res.json());
    } catch (e) { console.error(e); }
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
    
    // Polling for MVP simplicity
    const interval = setInterval(() => {
      fetchPools(token);
    }, 5000);
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
    } catch (e) { console.error(e); }
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
    } catch (e) { console.error(e); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Driver Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '0.5rem' }}>Logout</button>
      </div>
      <p>Welcome, {user.name}!</p>

      <div style={{ margin: '2rem 0', padding: '1rem', border: '1px solid #ccc' }}>
        <h3>Status: {isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}</h3>
        <button onClick={toggleOnline} style={{ padding: '0.5rem' }}>
          Go {isOnline ? 'Offline' : 'Online'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ margin: '2rem 0' }}>
        <h2>Active Pool</h2>
        {activePools.length === 0 ? <p>No active pools assigned yet.</p> : activePools.map(pool => (
          <div key={pool.id} style={{ border: '1px solid blue', padding: '1rem', marginBottom: '1rem' }}>
            <p><strong>Pool ID:</strong> {pool.id}</p>
            <ul>
              {pool.rideRequests.map((ride: any) => (
                <li key={ride.id}>
                  Passenger: {ride.passenger.name} | {ride.pickup_zone} ➡️ {ride.destination_zone} | Seats: {ride.seats_requested} | Fare: {ride.fare_amount / 100} BDT | Status: {ride.status}
                </li>
              ))}
            </ul>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={() => transitionPool(pool.id, 'ACCEPTED')}>Accept Pool</button>
              <button onClick={() => transitionPool(pool.id, 'DRIVER_ARRIVED')}>Arrived</button>
              <button onClick={() => transitionPool(pool.id, 'STARTED')}>Start Trip</button>
              <button onClick={() => transitionPool(pool.id, 'COMPLETED')}>Complete Trip</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ margin: '2rem 0' }}>
        <h2>Ride History</h2>
        {history.length === 0 ? <p>No completed rides yet.</p> : history.map(pool => (
          <div key={pool.id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
            <p><strong>Pool ID:</strong> {pool.id} | Completed At: {new Date(pool.updatedAt).toLocaleString()}</p>
            <ul>
              {pool.rideRequests.map((ride: any) => (
                <li key={ride.id}>
                  {ride.passenger.name} ({ride.pickup_zone} ➡️ {ride.destination_zone}) - {ride.fare_amount / 100} BDT
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
