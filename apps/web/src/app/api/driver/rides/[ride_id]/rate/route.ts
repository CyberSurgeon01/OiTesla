export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { readJsonBody, apiError } from '@/lib/http-error';
import { MAX_RATING_COMMENT_LENGTH, parseRatingComment, parseRatingValue } from '@/lib/rating';

export async function POST(req: NextRequest, { params }: { params: Promise<{ ride_id: string }> }) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'DRIVER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { rating, comment } = await readJsonBody(req);
    const rideId = Number((await params).ride_id);
    if (!Number.isSafeInteger(rideId) || rideId < 1) {
      return NextResponse.json({ error: 'Invalid ride ID' }, { status: 400 });
    }
    const ratingValue = parseRatingValue(rating);
    if (ratingValue === null) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }
    const parsedComment = parseRatingComment(comment);
    if (!parsedComment.ok) {
      return NextResponse.json(
        { error: `Comment must be text of at most ${MAX_RATING_COMMENT_LENGTH} characters` },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    // Scoping the write through the pool's vehicle is what stops a driver from rating a
    // ride on someone else's pool, and COMPLETED keeps it to finished trips only.
    const updated = await prisma.rideRequest.updateMany({
      where: {
        id: rideId,
        status: 'COMPLETED',
        pool: { vehicle: { driver_id: user.id } },
      },
      data: { driver_rating: ratingValue, driver_rating_comment: parsedComment.value },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Ride not found or not eligible for rating' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 'Unable to submit rating');
  }
}
