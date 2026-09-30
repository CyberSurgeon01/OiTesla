import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';

const clerk = clerkMiddleware();

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  // App API routes authenticate their own bearer tokens. Only the OAuth bridge
  // needs Clerk; a Clerk outage must not block health checks or password login.
  if (req.nextUrl.pathname.startsWith('/api/') && req.nextUrl.pathname !== '/api/auth/clerk-sync') {
    return NextResponse.next();
  }
  return clerk(req, event);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
};
