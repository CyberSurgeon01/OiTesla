"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[#0A0D0B] text-white px-6 selection:bg-[#10B981]/30">
      
      <div className="z-10 w-full max-w-[420px] rounded-[2rem] border border-[#1E2621] bg-[#131815] p-8 sm:p-10 shadow-2xl">
        <div className="flex flex-col space-y-2 mb-8 text-left">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#F3F4F6]">Sign in to OiTesla</h1>
          <p className="text-sm text-[#88928B]">Track your rides and split the fare.</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-[#D1D5DB]">Email</label>
            <input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              disabled={loading}
              className="w-full rounded-xl border border-[#1E2621] bg-[#0D110E] px-4 py-3.5 text-sm text-[#F3F4F6] placeholder-[#4B5563] focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981] transition-all disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-[#D1D5DB]">Password</label>
            <div className="relative">
              <input 
                id="password" 
                type={showPassword ? "text" : "password"}
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                disabled={loading}
                className="w-full rounded-xl border border-[#1E2621] bg-[#0D110E] pl-4 pr-11 py-3.5 text-sm text-[#F3F4F6] placeholder-[#4B5563] focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981] transition-all disabled:opacity-50"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-[#D1D5DB] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading} 
              className="group relative flex w-full items-center justify-center rounded-xl bg-[#F0FDF4] px-4 py-3 text-sm font-semibold text-[#022C22] transition-all duration-300 hover:bg-[#DCFCE7] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </button>
          </div>
        </form>
        
        <div className="mt-8 text-center text-sm text-[#88928B]">
          New here?{" "}
          <Link href="/signup" className="font-medium text-[#10B981] hover:text-[#34D399] transition-colors">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
