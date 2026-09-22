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

  if (!user || loading) return <div className="loading"><div className="spinner"></div></div>;

  const canCancel = activeRide && ['REQUESTED', 'MATCHED', 'ACCEPTED', 'DRIVER_ARRIVED'].includes(activeRide.status);
  
  // Status calculation for progress bar
  let progress = 0;
  if (activeRide) {
    if (activeRide.status === 'REQUESTED') progress = 20;
    else if (activeRide.status === 'MATCHED') progress = 40;
    else if (activeRide.status === 'ACCEPTED') progress = 60;
    else if (activeRide.status === 'DRIVER_ARRIVED') progress = 80;
    else if (activeRide.status === 'STARTED') progress = 100;
  }

  return (
    <div className="page-container">
      <div className="header">
        <div className="header-left">
          <h1>Passenger Dashboard</h1>
          <p>Welcome back, {user.name} 👋</p>
        </div>
        <div className="header-right">
          <Link href="/passenger/history" className="btn btn-ghost">Ride History</Link>
          <button onClick={handleLogout} className="btn btn-ghost">Logout</button>
        </div>
      </div>
      
      {error && <div className="alert alert-error">{error}</div>}

      {!activeRide ? (
        <div className="card">
          <h2 className="section-title">🚕 Request a Ride</h2>
          <form onSubmit={requestRide} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Pickup Zone</label>
                <select className="form-select" value={pickup} onChange={(e) => setPickup(e.target.value)}>
                  {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Destination Zone</label>
                <select className="form-select" value={destination} onChange={(e) => setDestination(e.target.value)}>
                  {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Seats Required</label>
                <input className="form-input" type="number" min="1" max="3" value={seats} onChange={(e) => setSeats(parseInt(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="TESLA_PAY">TeslaPay Wallet</option>
                </select>
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}>
              Find a Ride
            </button>
          </form>
        </div>
      ) : (
        <div className="card card-green">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ color: 'var(--green)' }}>Ride in Progress</h2>
              <div style={{ marginTop: '0.5rem', fontSize: '1.1rem', fontWeight: '500' }}>
                {activeRide.pickup_zone} ➡️ {activeRide.destination_zone}
              </div>
            </div>
            <div className="badge badge-green">{activeRide.status}</div>
          </div>
          
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
            <div>
              <div className="form-label">Seats</div>
              <div style={{ fontWeight: '600' }}>{activeRide.seats_requested}</div>
            </div>
            <div>
              <div className="form-label">Fare</div>
              <div style={{ fontWeight: '600', color: 'var(--green)' }}>{activeRide.fare_amount / 100} BDT</div>
            </div>
            <div>
              <div className="form-label">Payment</div>
              <div style={{ fontWeight: '600' }}>{activeRide.payment_method}</div>
            </div>
          </div>
          
          <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="status-steps">
              <div className={`status-step ${progress >= 20 ? 'completed' : ''} ${progress === 20 ? 'active' : ''}`}>Requested</div>
              <div className={`status-step ${progress >= 40 ? 'completed' : ''} ${progress === 40 ? 'active' : ''}`}>Matched</div>
              <div className={`status-step ${progress >= 60 ? 'completed' : ''} ${progress === 60 ? 'active' : ''}`}>Accepted</div>
              <div className={`status-step ${progress >= 80 ? 'completed' : ''} ${progress === 80 ? 'active' : ''}`}>Arrived</div>
              <div className={`status-step ${progress >= 100 ? 'completed' : ''} ${progress === 100 ? 'active' : ''}`}>In Trip</div>
            </div>
          </div>

          {canCancel && (
            <button onClick={cancelRide} className="btn btn-ghost" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
              Cancel Ride
            </button>
          )}
        </div>
      )}
    </div>
  );
}
