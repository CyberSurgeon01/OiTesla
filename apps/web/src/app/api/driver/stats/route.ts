import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { startOfDhakaDay, startOfDhakaMonth } from '@/lib/datetime';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'DRIVER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json({ gainedToday, gainedThisMonth });
  } catch (error) {
    console.error('[DRIVER_STATS]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
