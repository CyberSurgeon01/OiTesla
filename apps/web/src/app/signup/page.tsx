"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { readApiResponse } from '@/lib/api-response';
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
  const { signIn } = useSignIn();

  const handleGoogleSignIn = () => {
    if (!signIn) return;
    signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/sso-callback",
    });
  };

  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    
    toast({ title: "Sending...", description: "Securely connecting to server..." });
    
    try {
      const res = await fetch(`/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      
      const data = await readApiResponse(res);
      
      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      
      if (data.requiresVerification) {
        setStep('VERIFY');
        toast({ title: "Check your email", description: "We've sent a 6-digit verification code." });
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast({ title: "Success", description: "Account created successfully" });
        router.push(data.user.role === 'DRIVER' ? '/driver/dashboard' : '/passenger/dashboard');
      }
    } catch (err: any) {
      setStep('REGISTER');
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      
      const data = await readApiResponse(res);
      
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }
      
      toast({ title: "Success", description: "Account verified! Please log in." });
      router.push('/login');
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
                  id="name" type="text" placeholder="Rahul Chandra Shil" 
                  value={name} onChange={(e) => setName(e.target.value)} required disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981] transition-all disabled:opacity-50"
                />
              </div>
              
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">Email</label>
                <input 
                  id="email" type="email" placeholder="name@gmail.com" 
                  value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981] transition-all disabled:opacity-50"
                />
              </div>
              
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                <input 
                  id="password" type="password" minLength={8} autoComplete="new-password" placeholder="••••••••"
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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0A0D0B] px-4 text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="group relative flex h-14 w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[0.02] text-base font-semibold text-white transition-all duration-300 hover:bg-white/[0.05] hover:border-white/20 hover:-translate-y-1"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335"></path>
              <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4"></path>
              <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05"></path>
              <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26537 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853"></path>
            </svg>
            Google
          </button>

            
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
                Check your email inbox (and spam folder).
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
