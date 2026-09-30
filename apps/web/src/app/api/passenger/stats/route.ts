import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'PASSENGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayRides, monthRides] = await Promise.all([
      prisma.rideRequest.findMany({
        where: {
          passenger_id: user.id,
          status: 'COMPLETED',
          completed_at: { gte: today }
        },
        select: { fare_amount: true }
      }),
      prisma.rideRequest.findMany({
        where: {
          passenger_id: user.id,
          status: 'COMPLETED',
          completed_at: { gte: thisMonth }
        },
        select: { fare_amount: true }
      })
    ]);

    const spentToday = todayRides.reduce((sum, r) => sum + r.fare_amount, 0) / 100;
    const spentThisMonth = monthRides.reduce((sum, r) => sum + r.fare_amount, 0) / 100;

    return NextResponse.json({ spentToday, spentThisMonth });
  } catch (error) {
    console.error('[PASSENGER_STATS]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
