import Link from 'next/link';

export default function Home() {
  return (
    <main className="page-center">
      <div className="card" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>🚕 Welcome to OiTesla</h1>
        <p style={{ marginBottom: '2rem' }}>
          Dhaka's premier Tesla Rickshaw ride-pooling service. 
          Share a ride, save money, and maximize capacity!
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/login" className="btn btn-primary btn-lg">
            Login
          </Link>
          <Link href="/signup" className="btn btn-ghost btn-lg">
            Sign Up
          </Link>
        </div>

        <div className="demo-box" style={{ marginTop: '3rem', textAlign: 'left' }}>
          <h4>Demo Credentials</h4>
          <div className="cred"><span className="role">Driver:</span> <code>jashim@oitesla.com</code></div>
          <div className="cred"><span className="role">Passenger:</span> <code>nusrat@oitesla.com</code></div>
          <div className="cred"><span className="role">Passenger:</span> <code>rafiq@oitesla.com</code></div>
          <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>Password for all: <code>hashedpassword123</code></p>
        </div>
      </div>
    </main>
  )
}
