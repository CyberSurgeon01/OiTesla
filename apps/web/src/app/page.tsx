import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[#05050A] text-white px-6 py-24 selection:bg-[#4F6BFF]/30">
      
      {/* Simple Minimal Top Nav */}
      <nav className="absolute top-0 left-0 w-full p-6 sm:px-12 flex justify-between items-center z-50">
        <div className="text-xl font-black tracking-tighter text-white flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse" />
          OiTesla
        </div>
        <a href="https://github.com/CyberSurgeon01/OiTesla" target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
          GitHub
        </a>
      </nav>

      {/* Background Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4F6BFF] opacity-25 blur-[120px] pointer-events-none animate-[pulse_6s_ease-in-out_infinite] sm:h-[700px] sm:w-[700px] sm:opacity-20" />
      {/* Subtle Rickshaw Amber Glow */}
      <div className="absolute top-[60%] left-[60%] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F59E0B] opacity-10 blur-[100px] pointer-events-none sm:h-[400px] sm:w-[400px]" />

      {/* Main Content Container */}
      <div className="z-10 flex w-full max-w-lg flex-col items-center justify-center space-y-12 text-center mt-4">
        
        {/* Header Section */}
        <div className="flex flex-col items-center space-y-6">
          <h1 className="text-7xl font-black tracking-tighter text-white sm:text-8xl drop-shadow-2xl">
            OiTesla
          </h1>
          <p className="text-base font-medium text-gray-300 sm:text-xl max-w-[95%] mx-auto leading-relaxed">
            Share a seat. Split the fare. Survive <span className="text-white font-semibold border-b-2 border-[#F59E0B] pb-0.5">Dhaka</span> traffic.
          </p>
        </div>

        {/* Buttons Section */}
        <div className="flex w-full flex-col sm:flex-row justify-center items-center gap-4">
          <Link
            href="/login"
            className="group relative flex h-14 w-full sm:w-44 items-center justify-center rounded-full bg-[#4F6BFF] text-base font-semibold text-white shadow-[0_0_20px_rgba(79,107,255,0.4)] transition-all duration-300 hover:bg-[#4F6BFF]/90 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:-translate-y-1 hover:ring-2 hover:ring-[#F59E0B]/50"
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

        {/* Abstract Route Line SVG with Dhaka Rickshaw Yellow accents */}
        <div className="w-full max-w-[280px] opacity-100 sm:max-w-[380px] relative mt-2">
          <svg
            viewBox="0 0 300 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full drop-shadow-[0_0_15px_rgba(79,107,255,0.4)]"
          >
            {/* Smooth Wavy Line (Dashed map route) */}
            <path
              d="M 20 60 C 100 80, 200 20, 280 20"
              stroke="#4F6BFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="6 6"
              fill="none"
            />
            {/* Glowing Dot 1 (Start) */}
            <g className="animate-[pulse_3s_ease-in-out_infinite]">
              <circle cx="20" cy="60" r="5" fill="#F59E0B" stroke="#F59E0B" strokeWidth="2.5" />
              <circle cx="20" cy="60" r="12" fill="none" stroke="#F59E0B" strokeWidth="1.5" className="opacity-60" />
            </g>
            
            {/* Glowing Dot 2 (End) */}
            <g className="animate-[pulse_3s_ease-in-out_infinite_1.5s]">
              <circle cx="280" cy="20" r="5" fill="#F59E0B" stroke="#F59E0B" strokeWidth="2.5" />
              <circle cx="280" cy="20" r="12" fill="none" stroke="#F59E0B" strokeWidth="1.5" className="opacity-60" />
            </g>
          </svg>
        </div>


      </div>
    </div>
  );
}
