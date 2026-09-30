"use client";
import { useEffect, useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Onboarding() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [needsRole, setNeedsRole] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      checkAndSyncUser();
    }
  }, [isLoaded, isSignedIn, user]);

  const checkAndSyncUser = async (selectedRole?: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/clerk-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (data.needsRole) {
           setNeedsRole(true);
           setLoading(false);
           return;
        }
        throw new Error(data.error || 'Failed to sync user');
      }
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      toast({ title: 'Success', description: 'Logged in successfully via Google' });
      if (data.user.role === 'DRIVER') {
        router.push('/driver/dashboard');
      } else {
        router.push('/passenger/dashboard');
      }
      
    } catch (err: any) {
       toast({ title: 'Error', description: err.message, variant: 'destructive' });
       await signOut();
       router.push('/login');
    }
  };

  if (!isLoaded || loading || (!needsRole && isSignedIn)) {
    return <div className="flex h-screen items-center justify-center bg-[#0A0D0B]"><Loader2 className="w-8 h-8 animate-spin text-[#10B981]" /></div>;
  }

  if (needsRole) {
    return (
       <div className="flex h-screen flex-col items-center justify-center bg-[#0A0D0B] text-white selection:bg-[#10B981]/30">
         <div className="z-10 w-full max-w-[420px] rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 sm:p-10 backdrop-blur-2xl shadow-2xl text-center">
           <h2 className="text-3xl font-bold mb-2">Almost there!</h2>
           <p className="text-gray-400 mb-8 text-sm">Hi {user?.firstName}! Are you looking to ride or drive?</p>
           
           <div className="flex flex-col gap-4">
             <button onClick={() => checkAndSyncUser('PASSENGER')} className="w-full py-4 font-semibold text-lg border border-white/10 hover:border-[#10B981] rounded-xl bg-black/40 hover:bg-[#10B981]/10 transition-all">
               Passenger
             </button>
             <button onClick={() => checkAndSyncUser('DRIVER')} className="w-full py-4 font-semibold text-lg border border-white/10 hover:border-[#10B981] rounded-xl bg-black/40 hover:bg-[#10B981]/10 transition-all">
               Driver
             </button>
           </div>
         </div>
       </div>
    );
  }

  return (
     <div className="flex h-screen items-center justify-center bg-[#0A0D0B]">
       <Loader2 className="w-8 h-8 animate-spin text-[#10B981]" />
     </div>
  );
}
