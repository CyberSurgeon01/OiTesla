import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { startOfDhakaDay, startOfDhakaMonth } from '@/lib/datetime';
import { averageRating } from '@/lib/rating';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'DRIVER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const prisma = getPrisma();

    // Boundaries must be Dhaka-local: a ride completing at 00:30 Dhaka is "yesterday" in
    // UTC, so server-local (UTC on Vercel) boundaries would drop it from today's total.
    const now = new Date();
    const today = startOfDhakaDay(now);
    const thisMonth = startOfDhakaMonth(now);
    // Bucket on COALESCE(completed_at, requested_at) so a COMPLETED ride with a null
    // completed_at is not silently excluded from the driver's earnings.
    const since = (boundary: Date) => ({
      OR: [
        { completed_at: { gte: boundary } },
        { completed_at: null, requested_at: { gte: boundary } },
      ],
    });

    const [todayRides, monthRides] = await Promise.all([
      prisma.rideRequest.findMany({
        where: {
          pool: { vehicle: { driver_id: user.id } },
          status: 'COMPLETED',
          ...since(today),
        },
        select: { fare_amount: true }
      }),
      prisma.rideRequest.findMany({
        where: {
          pool: { vehicle: { driver_id: user.id } },
          status: 'COMPLETED',
          ...since(thisMonth),
        },
        select: { fare_amount: true }
      })
    ]);

    const gainedToday = todayRides.reduce((sum, r) => sum + r.fare_amount, 0) / 100;
    const gainedThisMonth = monthRides.reduce((sum, r) => sum + r.fare_amount, 0) / 100;

    // Averaged over every rated ride, not the current day or month: a reputation score that
    // resets each morning is not a reputation score. Unrated rides contribute nothing, so
    // ratingCount is the true sample size behind the mean.
    const rated = await prisma.rideRequest.findMany({
      where: {
        pool: { vehicle: { driver_id: user.id } },
        status: 'COMPLETED',
        rating: { not: null },
      },
      select: { rating: true },
    });

    return NextResponse.json({
      gainedToday,
      gainedThisMonth,
      averageRating: averageRating(rated.map((ride) => ride.rating)),
      ratingCount: rated.length,
    });
  } catch (error) {
    console.error('[DRIVER_STATS]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
