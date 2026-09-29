export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { VehicleStatus } from '@prisma/client';

export async function PATCH(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'DRIVER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { status } = await req.json();
    const driver_id = user.id;

    if (![VehicleStatus.ONLINE, VehicleStatus.OFFLINE].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.findFirst({ where: { driver_id } });
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

    const updated = await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { status }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update vehicle status' }, { status: 500 });
  }
}
