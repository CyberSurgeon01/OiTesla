"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!showContent) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0A0D0B]">
        <style>{`
          @keyframes subtleFloat {
            0% { transform: translateY(0px); opacity: 0; }
            20% { opacity: 1; transform: translateY(-5px); }
            80% { opacity: 1; transform: translateY(-5px); }
            100% { transform: translateY(-10px); opacity: 0; }
          }
          .animate-splash {
            animation: subtleFloat 3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
        `}</style>
        <div className="animate-splash">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#F3F4F6]">
            OiTesla.
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-1000 relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[#0A0D0B] text-[#F3F4F6] px-6 py-24 selection:bg-[#10B981]/30">
      
      {/* Minimal Top Nav */}
      <nav className="absolute top-0 left-0 w-full p-6 sm:px-12 flex justify-between items-center z-50">
        <div className="text-xl font-bold tracking-tight text-[#F3F4F6]">
          OiTesla
        </div>
        <a href="https://github.com/CyberSurgeon01/OiTesla" target="_blank" rel="noreferrer" className="text-sm font-medium text-[#88928B] hover:text-[#F3F4F6] transition-colors">
          GitHub
        </a>
      </nav>

      {/* Main Content Container */}
      <div className="z-10 flex w-full max-w-2xl flex-col items-center justify-center text-center mt-4">
        


        {/* Header Section */}
        <div className="flex flex-col items-center space-y-6 mb-12">
          <h1 className="text-6xl sm:text-8xl font-semibold tracking-tight text-[#F3F4F6] leading-[1.05]">
            Share a seat.<br/>
            <span className="text-[#88928B]">Split the fare.</span>
          </h1>
          <p className="text-base text-[#88928B] sm:text-xl max-w-[85%] mx-auto leading-relaxed mt-4">
            A premium pooling experience to help you survive the traffic.
          </p>
        </div>

        {/* Buttons Section */}
        <div className="flex w-full flex-col sm:flex-row justify-center items-center gap-4">
          <Link
            href="/login"
            className="group relative flex h-14 w-full sm:w-44 items-center justify-center rounded-xl bg-[#F0FDF4] text-base font-semibold text-[#022C22] transition-all duration-300 hover:bg-[#DCFCE7]"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="group flex h-14 w-full sm:w-56 items-center justify-center rounded-xl border border-[#1E2621] bg-[#131815] text-base font-semibold text-[#F3F4F6] transition-all duration-300 hover:border-[#2C3831] hover:bg-[#1A211D]"
          >
            Create Account <ArrowRight className="w-4 h-4 ml-2 text-[#88928B] group-hover:text-[#F3F4F6] transition-colors" />
          </Link>
        </div>

      </div>
    </div>
  );
}
