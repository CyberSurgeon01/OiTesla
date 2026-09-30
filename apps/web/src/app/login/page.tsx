"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { readApiResponse } from '@/lib/api-response';
import { Loader2, ArrowLeft, Car, UserRound, X } from 'lucide-react';
import { useClerk } from '@clerk/nextjs';

const DEMO_PASSWORD = 'hashedpassword123';
const DEMO_ACCOUNTS = [
  { name: 'Jashim', role: 'Driver', email: 'jashim@oitesla.com' },
  { name: 'Nusrat', role: 'Passenger', email: 'nusrat@oitesla.com' },
  { name: 'Rafiq', role: 'Passenger', email: 'rafiq@oitesla.com' },
  { name: 'Shirin', role: 'Passenger', email: 'shirin@oitesla.com' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const router = useRouter();
  const clerk = useClerk();

  const handleGoogleSignIn = async () => {
    try {
      if (!clerk.loaded) {
        console.error("Clerk is not loaded");
        return;
      }
      if (clerk.user) {
        window.location.href = "/onboarding";
        return;
      }
      console.log("Triggering Google OAuth...");
      await clerk.client.signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/onboarding",
        
      });
    } catch (err) {
      console.error("OAuth error:", err);
    }
  };

  const { toast } = useToast();

  useEffect(() => {
    if (!showDemoAccounts) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowDemoAccounts(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = '';
    };
  }, [showDemoAccounts]);

  const selectDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setShowDemoAccounts(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await readApiResponse(res);
      
      if (!res.ok) {
        if (data.requiresVerification) {
          router.push(`/verify?email=${encodeURIComponent(email)}`);
          return;
        }
        throw new Error(data.error || 'Login failed');
      }
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      toast({ title: "Success", description: "Logged in successfully" });
      
      if (data.user.role === 'DRIVER') {
        router.push('/driver/dashboard');
      } else {
        router.push('/passenger/dashboard');
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[#0A0D0B] text-white px-6 selection:bg-[#10B981]/30">
      
      {/* Back to Home Navigation */}
      <nav className="absolute top-0 left-0 w-full p-6 sm:px-12 flex justify-start items-center z-50">
        <Link href="/" className="group flex items-center text-sm font-semibold text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Home
        </Link>
      </nav>

      {/* Glassmorphism Auth Card */}
      <div className="z-10 w-full max-w-[420px] rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 sm:p-10 backdrop-blur-2xl shadow-2xl transition-all duration-500 hover:bg-white/[0.03] hover:border-white/20">
        <div className="flex flex-col space-y-2 text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="text-sm text-gray-400">Enter your credentials to access your account</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          
          

          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">Email</label>
            <input 
              id="email" 
              type="email" 
              placeholder="m@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981] transition-all disabled:opacity-50"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">Password</label>
            <input 
              id="password" 
              type="password" 
              placeholder="••••••••"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981] transition-all disabled:opacity-50"
            />
          </div>
          
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading} 
              className="group relative flex h-14 w-full items-center justify-center rounded-full bg-[#F0FDF4] text-base font-semibold text-[#022C22] shadow-[0_0_20px_rgba(240,253,244,0.2)] transition-all duration-300 hover:bg-[#DCFCE7] hover:shadow-[0_0_30px_rgba(240,253,244,0.4)] disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-1"
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Sign In
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
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-white hover:text-[#10B981] transition-colors underline underline-offset-4">
            Sign up
          </Link>
          <button
            type="button"
            onClick={() => setShowDemoAccounts(true)}
            className="mx-auto mt-3 block font-semibold text-[#10B981] underline decoration-[#10B981]/60 underline-offset-4 transition-colors hover:text-[#34D399]"
          >
            Demo accounts
          </button>
        </div>
      </div>

      {showDemoAccounts && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowDemoAccounts(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-accounts-title"
            className="relative max-h-[calc(100vh-4rem)] w-full max-w-md overflow-y-auto rounded-[2rem] border border-white/10 bg-[#101512] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-8"
          >
            <button
              type="button"
              onClick={() => setShowDemoAccounts(false)}
              aria-label="Close demo accounts"
              className="absolute right-5 top-5 rounded-full border border-white/10 bg-white/5 p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="pr-10">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#10B981]">Quick access</p>
              <h2 id="demo-accounts-title" className="text-2xl font-bold text-white">Demo accounts</h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">Choose an account to fill in the login form.</p>
            </div>

            <div className="mt-6 space-y-3">
              {DEMO_ACCOUNTS.map((account) => {
                const Icon = account.role === 'Driver' ? Car : UserRound;
                return (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => selectDemoAccount(account.email)}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition-all hover:border-[#10B981]/50 hover:bg-[#10B981]/5 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#10B981]/20 bg-[#10B981]/10 text-[#34D399]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-white">{account.name}</span>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          {account.role}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-sm text-gray-400">{account.email}</span>
                    </span>
                    <span className="text-xs font-semibold text-[#10B981] opacity-0 transition-opacity group-hover:opacity-100">Use</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Password for all accounts</p>
              <p className="mt-1 font-mono text-sm font-semibold text-white">{DEMO_PASSWORD}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
