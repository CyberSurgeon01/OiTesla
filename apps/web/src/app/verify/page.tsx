"use client";
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';

function VerifyContent() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const role = searchParams.get('role') || 'PASSENGER';
  const { toast } = useToast();

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

  if (!email) {
    return (
      <div className="text-center">
        <p className="text-gray-400">Invalid verification link.</p>
        <Link href="/login" className="text-[#10B981] hover:underline mt-4 inline-block">Go to Login</Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col space-y-2 text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981]/10 border border-[#10B981]/20">
          <Mail className="h-8 w-8 text-[#10B981]" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Verify Email</h1>
        <p className="text-sm text-gray-400 mt-2">
          Enter the 6-digit code sent to <span className="text-white font-medium">{email}</span>.
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
      </form>
    </>
  );
}

export default function VerifyPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[#0A0D0B] text-white px-6 py-12 selection:bg-[#10B981]/30">
      <nav className="absolute top-0 left-0 w-full p-6 sm:px-12 flex justify-start items-center z-50">
        <Link href="/login" className="group flex items-center text-sm font-semibold text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Login
        </Link>
      </nav>
      <div className="z-10 w-full max-w-[420px] rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 sm:p-10 backdrop-blur-2xl shadow-2xl transition-all duration-500 hover:bg-white/[0.03] hover:border-white/20 mt-8">
        <Suspense fallback={<div className="flex justify-center"><Loader2 className="animate-spin text-[#10B981] w-8 h-8"/></div>}>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
