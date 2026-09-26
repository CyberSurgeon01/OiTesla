"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';

export default function Signup() {
  const [step, setStep] = useState<'REGISTER' | 'VERIFY'>('REGISTER');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('PASSENGER');
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      
      if (data.requiresVerification) {
        toast({ title: "Check your email", description: "We've sent a 6-digit verification code." });
        setStep('VERIFY');
      } else {
        // Fallback for older code without verification
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast({ title: "Success", description: "Account created successfully" });
        router.push(data.user.role === 'DRIVER' ? '/driver/dashboard' : '/passenger/dashboard');
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, code }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      toast({ title: "Success", description: "Email verified successfully!" });
      router.push(data.user.role === 'DRIVER' ? '/driver/dashboard' : '/passenger/dashboard');
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[#0A0D0B] text-white px-6 py-12 selection:bg-[#10B981]/30">
      
      {/* Back to Home Navigation */}
      <nav className="absolute top-0 left-0 w-full p-6 sm:px-12 flex justify-start items-center z-50">
        <Link href="/" className="group flex items-center text-sm font-semibold text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Home
        </Link>
      </nav>

      {/* Glassmorphism Auth Card */}
      <div className="z-10 w-full max-w-[420px] rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 sm:p-10 backdrop-blur-2xl shadow-2xl transition-all duration-500 hover:bg-white/[0.03] hover:border-white/20 mt-8">
        
        {step === 'REGISTER' ? (
          <>
            <div className="flex flex-col space-y-2 text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-white">Create Account</h1>
              <p className="text-sm text-gray-400">Join OiTesla to survive Dhaka traffic</p>
            </div>
            
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  id="name" type="text" placeholder="John Doe" 
                  value={name} onChange={(e) => setName(e.target.value)} required disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981] transition-all disabled:opacity-50"
                />
              </div>
              
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">Email</label>
                <input 
                  id="email" type="email" placeholder="m@example.com" 
                  value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981] transition-all disabled:opacity-50"
                />
              </div>
              
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                <input 
                  id="password" type="password" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981] transition-all disabled:opacity-50"
                />
              </div>
              
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">I am a...</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setRole('PASSENGER')} disabled={loading} className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-all ${role === 'PASSENGER' ? 'border-[#10B981] bg-[#10B981]/20 text-white' : 'border-white/10 bg-black/40 text-gray-400 hover:bg-white/5'}`}>Passenger</button>
                  <button type="button" onClick={() => setRole('DRIVER')} disabled={loading} className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-all ${role === 'DRIVER' ? 'border-[#34D399] bg-[#34D399]/20 text-white' : 'border-white/10 bg-black/40 text-gray-400 hover:bg-white/5'}`}>Driver</button>
                </div>
              </div>
              
              <div className="pt-4">
                <button type="submit" disabled={loading} className="group relative flex h-14 w-full items-center justify-center rounded-full bg-[#F0FDF4] text-base font-semibold text-[#022C22] shadow-[0_0_20px_rgba(240,253,244,0.2)] transition-all duration-300 hover:bg-[#DCFCE7] hover:shadow-[0_0_30px_rgba(240,253,244,0.4)] disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-1">
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Create Account
                </button>
              </div>
            </form>
            
            <div className="mt-8 text-center text-sm text-gray-400">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-white hover:text-[#10B981] transition-colors underline underline-offset-4">
                Sign in
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col space-y-2 text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981]/10 border border-[#10B981]/20">
                <Mail className="h-8 w-8 text-[#10B981]" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Verify Email</h1>
              <p className="text-sm text-gray-400 mt-2">
                We've sent a 6-digit code to <span className="text-white font-medium">{email}</span>.
                Check your console logs (Mock SMTP).
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-1.5 text-center">
                <label htmlFor="code" className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Verification Code</label>
                <input 
                  id="code" type="text" placeholder="000000" maxLength={6}
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required disabled={loading}
                  className="w-full text-center tracking-[0.5em] font-mono text-2xl rounded-xl border border-white/10 bg-black/40 px-4 py-4 text-white placeholder-gray-600 focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981] transition-all disabled:opacity-50"
                />
              </div>

              <div className="pt-2">
                <button type="submit" disabled={loading || code.length !== 6} className="group relative flex h-14 w-full items-center justify-center rounded-full bg-[#F0FDF4] text-base font-semibold text-[#022C22] shadow-[0_0_20px_rgba(240,253,244,0.2)] transition-all duration-300 hover:bg-[#DCFCE7] hover:shadow-[0_0_30px_rgba(240,253,244,0.4)] disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-1">
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Verify & Continue
                </button>
              </div>
              
              <div className="text-center">
                <button type="button" onClick={() => setStep('REGISTER')} className="text-sm text-gray-400 hover:text-white transition-colors underline-offset-4 hover:underline">
                  Use a different email
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
