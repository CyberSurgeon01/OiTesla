import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { RideStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'PASSENGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const passenger_id = user.id;
    const history = await prisma.rideRequest.findMany({
      where: { 
        passenger_id, 
        status: { in: [RideStatus.COMPLETED, RideStatus.CANCELLED] } 
      },
      include: { pool: { include: { vehicle: true } } },
      orderBy: { requested_at: 'desc' }
    });
    return NextResponse.json(history);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch ride history' }, { status: 500 });
  }
}
