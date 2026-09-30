export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { startOfDhakaDay, startOfDhakaMonth } from '@/lib/datetime';
import { averageRating } from '@/lib/rating';

/**
 * Passenger spend totals.
 *
 * Only COMPLETED rides count — a cancelled ride is never charged, so including it
 * overstated spend. Day and month boundaries are Dhaka's, not the server's: the
 * deployment runs in UTC, where a ride completed at 00:30 in Dhaka belongs to the
 * previous UTC day.
 *
 * Rides are bucketed on COALESCE(completed_at, requested_at). A COMPLETED ride with a
 * null completed_at is still money the passenger was charged, and filtering on
 * completed_at alone silently dropped it from every total.
 *
 * Totals are returned in integer poysha and formatted in the browser.
 */
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'PASSENGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = startOfDhakaDay();
    const month = startOfDhakaMonth();
    const since = (boundary: Date) => ({
      OR: [
        { completed_at: { gte: boundary } },
        { completed_at: null, requested_at: { gte: boundary } },
      ],
    });

    const [todayRides, monthRides] = await Promise.all([
      getPrisma().rideRequest.findMany({
        where: { passenger_id: user.id, status: 'COMPLETED', ...since(today) },
        select: { fare_amount: true },
      }),
      getPrisma().rideRequest.findMany({
        where: { passenger_id: user.id, status: 'COMPLETED', ...since(month) },
        select: { fare_amount: true },
      }),
    ]);

    const sum = (rides: { fare_amount: number }[]) => rides.reduce((total, ride) => total + ride.fare_amount, 0);

    // What drivers thought of this passenger, over every rated ride rather than today's or
    // this month's. Unrated rides contribute nothing, so ratingCount is the sample size.
    const rated = await getPrisma().rideRequest.findMany({
      where: { passenger_id: user.id, status: 'COMPLETED', driver_rating: { not: null } },
      select: { driver_rating: true },
    });

    return NextResponse.json({
      spentToday: sum(todayRides),
      spentThisMonth: sum(monthRides),
      averageRating: averageRating(rated.map((ride) => ride.driver_rating)),
      ratingCount: rated.length,
    });
  } catch (error) {
    console.error('[PASSENGER_STATS]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}