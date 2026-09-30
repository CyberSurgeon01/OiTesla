export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { readJsonBody, apiError } from '@/lib/http-error';

export async function POST(req: NextRequest, { params }: { params: Promise<{ ride_id: string }> }) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'PASSENGER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
    const { rating, comment } = await readJsonBody(req);
    const rideId = Number((await params).ride_id);
    if (!Number.isSafeInteger(rideId) || rideId < 1) {
      return NextResponse.json({ error: 'Invalid ride ID' }, { status: 400 });
    }
    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }
    if (comment != null && (typeof comment !== 'string' || comment.length > 2000)) {
      return NextResponse.json({ error: 'Comment must be text of at most 2000 characters' }, { status: 400 });
    }

    const prisma = getPrisma();
    const updated = await prisma.rideRequest.updateMany({
      where: { id: rideId, passenger_id: user.id, status: 'COMPLETED' },
      data: { rating, rating_comment: typeof comment === 'string' ? comment.trim() || null : null }
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Ride not found or not eligible for rating' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Unable to submit rating');
  }
}
