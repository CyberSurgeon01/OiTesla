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

    const pools = await prisma.pool.findMany({
      where: { 
        vehicle_id: vehicle.id, 
        status: PoolStatus.ACTIVE 
      },
      include: {
        vehicle: true,
        rideRequests: {
          include: { passenger: { select: { name: true, id: true } } },
          orderBy: { requested_at: 'asc' }
        }
      }
    });

    return NextResponse.json(pools);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch active pools' }, { status: 500 });
  }
}
