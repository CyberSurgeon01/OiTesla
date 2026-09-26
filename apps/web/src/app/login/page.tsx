"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
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
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[#05050A] text-white px-6 selection:bg-[#4F6BFF]/30">
      
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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#4F6BFF]/10">
            <div className="h-4 w-4 rounded-full bg-[#4F6BFF] shadow-[0_0_15px_rgba(79,107,255,1)] animate-pulse" />
          </div>
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
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:border-[#4F6BFF] focus:outline-none focus:ring-1 focus:ring-[#4F6BFF] transition-all disabled:opacity-50"
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
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:border-[#4F6BFF] focus:outline-none focus:ring-1 focus:ring-[#4F6BFF] transition-all disabled:opacity-50"
            />
          </div>
          
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading} 
              className="group relative flex h-14 w-full items-center justify-center rounded-full bg-[#4F6BFF] text-base font-semibold text-white shadow-[0_0_20px_rgba(79,107,255,0.4)] transition-all duration-300 hover:bg-[#4F6BFF]/90 hover:shadow-[0_0_30px_rgba(79,107,255,0.6)] disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-1"
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Sign In
            </button>
          </div>
        </form>
        
        <div className="mt-8 text-center text-sm text-gray-400">
          Don't have an account?{" "}
          <Link href="/signup" className="font-semibold text-white hover:text-[#4F6BFF] transition-colors underline underline-offset-4">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
