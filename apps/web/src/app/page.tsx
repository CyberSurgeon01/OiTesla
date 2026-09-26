import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#0A0A0F] text-white px-4 py-12">
      {/* Glow Effect Behind Title */}
      <div className="absolute top-[35%] left-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4F6BFF] opacity-35 blur-[120px] pointer-events-none sm:h-[450px] sm:w-[450px]" />

      <div className="z-10 flex w-full max-w-md flex-col items-center justify-center space-y-10 text-center sm:max-w-lg mt-8">
        
        {/* Text Section */}
        <div className="flex flex-col items-center space-y-5">
          <h1 className="text-7xl font-black tracking-tight text-white sm:text-8xl">
            OiTesla
          </h1>
          <p className="text-base font-medium text-gray-300 sm:text-lg">
            Share a seat. Split the fare. Survive Dhaka traffic.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex w-full flex-row justify-center gap-4">
          <Link
            href="/login"
            className="flex h-12 w-36 items-center justify-center rounded-full bg-[#4F6BFF] text-sm font-semibold text-white shadow-[0_0_20px_rgba(79,107,255,0.4)] transition-all hover:bg-[#4F6BFF]/80 hover:shadow-[0_0_30px_rgba(79,107,255,0.6)]"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="flex h-12 w-40 items-center justify-center rounded-full border border-white/20 bg-transparent text-sm font-semibold text-white transition-all hover:bg-white/10"
          >
            Create Account
          </Link>
        </div>

        {/* SVG Route Graphic */}
        <div className="w-full max-w-[280px] mt-4 opacity-90 sm:max-w-[350px]">
          <svg
            viewBox="0 0 300 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full drop-shadow-[0_0_15px_rgba(79,107,255,0.5)]"
          >
            {/* Wavy Line */}
            <path
              d="M 20 50 C 120 70, 180 10, 280 30"
              stroke="#4F6BFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Glowing Dot 1 */}
            <circle cx="20" cy="50" r="5" fill="white" stroke="#4F6BFF" strokeWidth="2.5" />
            <circle cx="20" cy="50" r="9" fill="none" stroke="#4F6BFF" strokeWidth="1" className="opacity-60" />
            
            {/* Glowing Dot 2 */}
            <circle cx="280" cy="30" r="5" fill="white" stroke="#4F6BFF" strokeWidth="2.5" />
            <circle cx="280" cy="30" r="9" fill="none" stroke="#4F6BFF" strokeWidth="1" className="opacity-60" />
          </svg>
        </div>

        {/* Glassmorphism Demo Credentials Card */}
        <div className="mt-12 w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl shadow-2xl text-left transition-all hover:bg-white/[0.06]">
          <div className="mb-5 flex flex-col space-y-1.5">
            <h3 className="text-xl font-semibold tracking-tight text-white">Demo Credentials</h3>
            <p className="text-sm text-gray-400">Use these to test the application</p>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col space-y-1.5">
              <span className="text-sm font-medium text-gray-300">Driver</span>
              <code className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200">
                jashim@oitesla.com
              </code>
            </div>
            <div className="flex flex-col space-y-1.5">
              <span className="text-sm font-medium text-gray-300">Passengers</span>
              <code className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200">
                nusrat@oitesla.com
              </code>
              <code className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200">
                rafiq@oitesla.com
              </code>
            </div>
            <p className="mt-6 border-t border-white/10 pt-5 text-sm text-gray-400">
              Password for all accounts:{' '}
              <strong className="text-white">hashedpassword123</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
