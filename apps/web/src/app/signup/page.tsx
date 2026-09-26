"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function Signup() {
  const [step, setStep] = useState(1);
  
  const [role, setRole] = useState('PASSENGER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      toast({ title: "Success", description: "Account created successfully" });
      
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
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[#0A0D0B] text-white px-6 selection:bg-[#10B981]/30 py-12">
      
      <div className="z-10 w-full max-w-[420px] rounded-[2rem] border border-[#1E2621] bg-[#131815] p-8 sm:p-10 shadow-2xl transition-all duration-300">
        
        {step === 1 ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col space-y-2 mb-8 text-left">
              <h1 className="text-[22px] font-semibold tracking-tight text-[#F3F4F6]">Create an account</h1>
              <p className="text-sm text-[#88928B]">Choose the role that matches you.</p>
            </div>
            
            <div className="space-y-3 mb-8">
              {/* Passenger Role Card */}
              <div 
                onClick={() => setRole('PASSENGER')}
                className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border ${
                  role === 'PASSENGER' 
                    ? 'border-[#10B981] bg-[#0A110D]' 
                    : 'border-[#1E2621] bg-[#0D110E] hover:border-[#2C3831]'
                }`}
              >
                <div className="font-medium text-sm text-[#F3F4F6] mb-1">Passenger</div>
                <div className="text-[13px] text-[#88928B] leading-relaxed">
                  Book rides, share the fare with others, and survive Dhaka traffic.
                </div>
              </div>

              {/* Driver Role Card */}
              <div 
                onClick={() => setRole('DRIVER')}
                className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border ${
                  role === 'DRIVER' 
                    ? 'border-[#10B981] bg-[#0A110D]' 
                    : 'border-[#1E2621] bg-[#0D110E] hover:border-[#2C3831]'
                }`}
              >
                <div className="font-medium text-sm text-[#F3F4F6] mb-1">Driver</div>
                <div className="text-[13px] text-[#88928B] leading-relaxed">
                  Pick up passengers along your route and earn money efficiently.
                </div>
              </div>
            </div>

            <button 
              onClick={() => setStep(2)}
              className="group relative flex w-full items-center justify-center rounded-xl bg-[#F0FDF4] px-4 py-3 text-sm font-semibold text-[#022C22] transition-all duration-300 hover:bg-[#DCFCE7]"
            >
              Continue
            </button>
            
            <div className="mt-8 text-center text-sm text-[#88928B]">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-[#10B981] hover:text-[#34D399] transition-colors">
                Sign in
              </Link>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <button 
              onClick={() => setStep(1)}
              className="flex items-center text-sm text-[#88928B] hover:text-[#D1D5DB] transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </button>

            <div className="flex flex-col space-y-2 mb-8 text-left">
              <h1 className="text-[22px] font-semibold tracking-tight text-[#F3F4F6]">Your Details</h1>
              <p className="text-sm text-[#88928B]">Sign up as a {role.toLowerCase()}.</p>
            </div>
            
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium text-[#D1D5DB]">Full Name</label>
                <input 
                  id="name" 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  disabled={loading}
                  className="w-full rounded-xl border border-[#1E2621] bg-[#0D110E] px-4 py-3.5 text-sm text-[#F3F4F6] placeholder-[#4B5563] focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981] transition-all disabled:opacity-50"
                />
              </div>

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
                  Create Account
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
