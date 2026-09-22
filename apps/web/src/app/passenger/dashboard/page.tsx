"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ZONES = ['Banani', 'Gulshan', 'Mohakhali', 'Dhanmondi', 'Mirpur', 'Uttara', 'Farmgate', 'Bashundhara'];

export default function PassengerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form State
  const [pickup, setPickup] = useState(ZONES[0]);
  const [destination, setDestination] = useState(ZONES[1]);
  const [seats, setSeats] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  
  const router = useRouter();

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
    setError('');
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
      
      fetchActiveRide(token as string);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const cancelRide = async () => {
    if (!activeRide) return;
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
        setError(data.error || 'Failed to cancel');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user || loading) return <p>Loading...</p>;

  // Check if passenger is allowed to cancel
  const canCancel = activeRide && ['REQUESTED', 'MATCHED', 'ACCEPTED', 'DRIVER_ARRIVED'].includes(activeRide.status);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Passenger Dashboard</h1>
        <div>
          <Link href="/passenger/history" style={{ marginRight: '1rem' }}>Ride History</Link>
          <button onClick={handleLogout} style={{ padding: '0.5rem' }}>Logout</button>
        </div>
      </div>
      <p>Welcome, {user.name}!</p>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!activeRide ? (
        <div style={{ margin: '2rem 0', padding: '1rem', border: '1px solid #ccc' }}>
          <h2>Request a Ride</h2>
          <form onSubmit={requestRide} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label>
              Pickup Zone:
              <select value={pickup} onChange={(e) => setPickup(e.target.value)} style={{ marginLeft: '1rem', padding: '0.5rem' }}>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </label>
            <label>
              Destination Zone:
              <select value={destination} onChange={(e) => setDestination(e.target.value)} style={{ marginLeft: '1rem', padding: '0.5rem' }}>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </label>
            <label>
              Seats Required:
              <input type="number" min="1" max="3" value={seats} onChange={(e) => setSeats(parseInt(e.target.value))} style={{ marginLeft: '1rem', padding: '0.5rem' }} />
            </label>
            <label>
              Payment Method:
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginLeft: '1rem', padding: '0.5rem' }}>
                <option value="CASH">Cash</option>
                <option value="TESLA_PAY">TeslaPay Wallet</option>
              </select>
            </label>
            <button type="submit" style={{ padding: '0.5rem', alignSelf: 'flex-start' }}>Request Ride</button>
          </form>
        </div>
      ) : (
        <div style={{ margin: '2rem 0', padding: '1rem', border: '1px solid green' }}>
          <h2>Current Ride Status: {activeRide.status}</h2>
          <p><strong>Route:</strong> {activeRide.pickup_zone} ➡️ {activeRide.destination_zone}</p>
          <p><strong>Seats:</strong> {activeRide.seats_requested}</p>
          <p><strong>Fare:</strong> {activeRide.fare_amount / 100} BDT ({activeRide.payment_method})</p>
          
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ flexGrow: 1, height: '10px', background: '#eee', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                background: 'green', 
                width: activeRide.status === 'REQUESTED' ? '20%' :
                       activeRide.status === 'MATCHED' ? '40%' :
                       activeRide.status === 'ACCEPTED' ? '60%' :
                       activeRide.status === 'DRIVER_ARRIVED' ? '80%' : '100%'
              }} />
            </div>
            <span>
              {activeRide.status === 'REQUESTED' ? 'Waiting for Match...' :
               activeRide.status === 'MATCHED' ? 'Matched, awaiting driver acceptance' :
               activeRide.status === 'ACCEPTED' ? 'Driver Accepted, on the way' :
               activeRide.status === 'DRIVER_ARRIVED' ? 'Driver Arrived!' : 'Ride in Progress'}
            </span>
          </div>

          <button 
            onClick={cancelRide} 
            disabled={!canCancel}
            style={{ 
              marginTop: '1rem', 
              padding: '0.5rem', 
              background: canCancel ? 'red' : 'gray', 
              color: 'white',
              border: 'none',
              cursor: canCancel ? 'pointer' : 'not-allowed'
            }}
          >
            Cancel Ride
          </button>
        </div>
      )}
    </div>
  );
}
