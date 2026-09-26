import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[#05050A] text-white px-6 py-20 selection:bg-[#4F6BFF]/30">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4F6BFF] opacity-25 blur-[120px] pointer-events-none animate-[pulse_6s_ease-in-out_infinite] sm:h-[700px] sm:w-[700px] sm:opacity-20" />

      {/* Main Content Container */}
      <div className="z-10 flex w-full max-w-lg flex-col items-center justify-center space-y-14 text-center">
        
        {/* Header Section */}
        <div className="flex flex-col items-center space-y-6">
          <h1 className="text-7xl font-black tracking-tighter text-white sm:text-8xl drop-shadow-2xl">
            OiTesla
          </h1>
          <p className="text-base font-medium text-gray-300 sm:text-xl max-w-[90%] mx-auto">
            Share a seat. Split the fare. Survive Dhaka traffic.
          </p>
        </div>

        {/* Buttons Section */}
        <div className="flex w-full flex-col sm:flex-row justify-center items-center gap-4">
          <Link
            href="/login"
            className="group relative flex h-14 w-full sm:w-44 items-center justify-center rounded-full bg-[#4F6BFF] text-base font-semibold text-white shadow-[0_0_20px_rgba(79,107,255,0.4)] transition-all duration-300 hover:bg-[#4F6BFF]/90 hover:shadow-[0_0_40px_rgba(79,107,255,0.7)] hover:-translate-y-1"
          >
            <span>Sign In</span>
          </Link>
          <Link
            href="/signup"
            className="flex h-14 w-full sm:w-48 items-center justify-center rounded-full border border-white/20 bg-white/[0.02] backdrop-blur-md text-base font-semibold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/40 hover:-translate-y-1"
          >
            Create Account
          </Link>
        </div>

        {/* Abstract Route Line SVG */}
        <div className="w-full max-w-[280px] opacity-100 sm:max-w-[380px] relative mt-4">
          <svg
            viewBox="0 0 300 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full drop-shadow-[0_0_15px_rgba(79,107,255,0.6)]"
          >
            {/* Smooth Wavy Line */}
            <path
              d="M 20 60 C 100 80, 200 20, 280 20"
              stroke="#4F6BFF"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            {/* Glowing Dot 1 (Start) */}
            <g className="animate-[pulse_3s_ease-in-out_infinite]">
              <circle cx="20" cy="60" r="5" fill="white" stroke="#4F6BFF" strokeWidth="2.5" />
              <circle cx="20" cy="60" r="12" fill="none" stroke="#4F6BFF" strokeWidth="1.5" className="opacity-60" />
            </g>
            
            {/* Glowing Dot 2 (End) */}
            <g className="animate-[pulse_3s_ease-in-out_infinite_1.5s]">
              <circle cx="280" cy="20" r="5" fill="white" stroke="#4F6BFF" strokeWidth="2.5" />
              <circle cx="280" cy="20" r="12" fill="none" stroke="#4F6BFF" strokeWidth="1.5" className="opacity-60" />
            </g>
          </svg>
        </div>

      </div>
    </div>
  );
}
