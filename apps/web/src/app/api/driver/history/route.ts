import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { PoolStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'DRIVER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const driver_id = user.id;
    const vehicle = await prisma.vehicle.findFirst({ where: { driver_id } });
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

    const history = await prisma.pool.findMany({
      where: { vehicle_id: vehicle.id, status: PoolStatus.COMPLETED },
      include: {
        vehicle: true,
        rideRequests: {
          include: { passenger: { select: { name: true, id: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
