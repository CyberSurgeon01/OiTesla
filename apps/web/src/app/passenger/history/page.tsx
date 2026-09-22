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
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Ride History</h1>
        <Link href="/passenger/dashboard">Back to Dashboard</Link>
      </div>

      <div style={{ margin: '2rem 0' }}>
        {history.length === 0 ? <p>No past rides found.</p> : history.map(ride => (
          <div key={ride.id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
            <p><strong>Status:</strong> {ride.status}</p>
            <p><strong>Route:</strong> {ride.pickup_zone} ➡️ {ride.destination_zone}</p>
            <p><strong>Fare:</strong> {ride.fare_amount / 100} BDT ({ride.payment_method})</p>
            <p><strong>Requested At:</strong> {new Date(ride.requested_at).toLocaleString()}</p>
            {ride.pool && <p><strong>Vehicle:</strong> {ride.pool.vehicle.name}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
