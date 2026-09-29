export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { VehicleStatus } from '@prisma/client';
import { readJsonBody, apiError } from '@/lib/http-error';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'DRIVER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const vehicle = await getPrisma().vehicle.findFirst({ where: { driver_id: user.id } });
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    return NextResponse.json(vehicle);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to fetch vehicle status' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'DRIVER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const prisma = getPrisma();

    const { status } = await readJsonBody(req);
    const driver_id = user.id;

    if (status !== VehicleStatus.ONLINE && status !== VehicleStatus.OFFLINE) {
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
    return apiError(error, 'Failed to update vehicle status');
  }
}
