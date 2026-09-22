"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DriverDashboard() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

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
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Driver Dashboard</h1>
      <p>Welcome, {user.name}!</p>
      <button onClick={handleLogout} style={{ padding: '0.5rem', marginTop: '1rem' }}>Logout</button>
    </div>
  );
}
