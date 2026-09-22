"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PassengerHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchHistory = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/passenger/rides/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setHistory(await res.json());
      } catch (e) {
        console.error(e);
      }
    };

    fetchHistory();
  }, [router]);

  return (
    <div className="page-container">
      <div className="header">
        <div className="header-left">
          <h1>My Ride History</h1>
        </div>
        <div className="header-right">
          <Link href="/passenger/dashboard" className="btn btn-ghost">Back to Dashboard</Link>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {history.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🕒</div>
            <p>No past rides found.</p>
          </div>
        ) : history.map(ride => (
          <div key={ride.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ fontWeight: '500', fontSize: '1.1rem' }}>
                {ride.pickup_zone} ➡️ {ride.destination_zone}
              </div>
              <div className={`badge ${ride.status === 'COMPLETED' ? 'badge-green' : ride.status === 'CANCELLED' ? 'badge-red' : 'badge-muted'}`}>
                {ride.status}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <div className="form-label">Fare</div>
                <div style={{ fontWeight: '600' }}>{ride.fare_amount / 100} BDT</div>
              </div>
              <div>
                <div className="form-label">Method</div>
                <div>{ride.payment_method}</div>
              </div>
              <div>
                <div className="form-label">Date</div>
                <div>{new Date(ride.requested_at).toLocaleDateString()}</div>
              </div>
              {ride.pool && (
                <div>
                  <div className="form-label">Vehicle</div>
                  <div>{ride.pool.vehicle.name}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
