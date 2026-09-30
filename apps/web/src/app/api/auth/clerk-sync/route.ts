export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getPrisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@/lib/server-config';
import { syncClerkAccount } from '@/lib/clerk-account';
import { apiError, HttpError, readJsonBody } from '@/lib/http-error';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) throw new HttpError(401, 'Unauthorized');
    const clerkUser = await currentUser();
    if (!clerkUser || clerkUser.id !== userId) throw new HttpError(401, 'Unauthorized');
    const primaryEmail = clerkUser.emailAddresses.find(address => address.id === clerkUser.primaryEmailAddressId);
    if (!primaryEmail || primaryEmail.verification?.status !== 'verified') {
      throw new HttpError(403, 'Verify your primary email before signing in');
    }
    const email = primaryEmail.emailAddress.trim().toLowerCase();
    const name = clerkUser.fullName || clerkUser.firstName || 'User';
    const { role } = await readJsonBody(req);
    if (role !== undefined && role !== 'PASSENGER' && role !== 'DRIVER') {
      throw new HttpError(400, 'Invalid role');
    }
    const secret = getJwtSecret();
    const user = await syncClerkAccount(getPrisma(), { userId, email, name }, role);
    if (!user) return NextResponse.json({ needsRole: true }, { status: 400 });
    const profile = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign(profile, secret, { expiresIn: '7d' });
    return NextResponse.json({ token, user: profile });
  } catch (error) {
    return apiError(error, 'Unable to sign in with Google. Please try again.');
  }
}
