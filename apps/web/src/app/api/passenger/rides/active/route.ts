export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { RideStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'PASSENGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const prisma = getPrisma();

    const passenger_id = user.id;
    const activeRide = await prisma.rideRequest.findFirst({
      where: { 
        passenger_id, 
        status: { notIn: [RideStatus.CANCELLED, RideStatus.COMPLETED] } 
      },
      include: { pool: { include: { vehicle: true } } },
      orderBy: { requested_at: 'desc' }
    });
    return NextResponse.json(activeRide || null);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch active ride' }, { status: 500 });
  }
}
