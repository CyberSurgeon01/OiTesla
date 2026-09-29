export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export async function GET() {
  const prisma = getPrisma();
  await prisma.rideRequest.updateMany({ where: { status: { notIn: ['CANCELLED', 'COMPLETED'] } }, data: { status: 'CANCELLED', cancelled_at: new Date() } });
  await prisma.pool.updateMany({ where: { status: 'ACTIVE' }, data: { status: 'CANCELLED' } });
  await prisma.vehicle.updateMany({ where: { status: 'ONLINE' }, data: { status: 'OFFLINE' } });
  return NextResponse.json({ message: "All vehicles taken offline and all rides cancelled. System reset!" });
}
