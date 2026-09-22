import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ maxWidth: '600px', margin: '100px auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>🚕 Welcome to OiTesla</h1>
      <p style={{ color: '#666', marginBottom: '40px' }}>
        Dhaka's premier Tesla Rickshaw ride-pooling service. 
        Share a ride, save money, and maximize capacity!
      </p>
      
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
        <Link 
          href="/login" 
          style={{ padding: '10px 20px', background: '#0070f3', color: 'white', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
          Login
        </Link>
        <Link 
          href="/signup" 
          style={{ padding: '10px 20px', background: '#eaeaea', color: '#333', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
          Sign Up
        </Link>
      </div>

      <div style={{ marginTop: '60px', textAlign: 'left', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
        <h3>Demo Credentials</h3>
        <p><strong>Driver:</strong> jashim@oitesla.com (Pass: hashedpassword123)</p>
        <p><strong>Passenger:</strong> nusrat@oitesla.com (Pass: hashedpassword123)</p>
        <p><strong>Passenger:</strong> rafiq@oitesla.com (Pass: hashedpassword123)</p>
      </div>
    </main>
  )
}
