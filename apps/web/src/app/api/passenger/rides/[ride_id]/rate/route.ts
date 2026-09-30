export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { readJsonBody, apiError } from '@/lib/http-error';

export async function POST(req: NextRequest, { params }: { params: { ride_id: string } }) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'PASSENGER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
    const { rating, comment } = await readJsonBody(req);
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }

    const prisma = getPrisma();
    const updated = await prisma.rideRequest.updateMany({
      where: { id: Number(params.ride_id), passenger_id: user.id, status: 'COMPLETED' },
      data: { rating, rating_comment: comment || null }
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Ride not found or not eligible for rating' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Unable to submit rating');
  }
}
