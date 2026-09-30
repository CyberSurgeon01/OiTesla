export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { apiError, HttpError } from '@/lib/http-error';
import { acceptRide } from '@/lib/rides';

export async function POST(req: NextRequest, { params }: { params: Promise<{ ride_id: string }> }) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'DRIVER') throw new HttpError(403, 'Forbidden');
    const ride = await acceptRide(getPrisma(), user.id, Number((await params).ride_id));
    return NextResponse.json({ success: true, ride });
  } catch (error) {
    return apiError(error, 'Unable to accept this ride. Please try again.');
  }
}
