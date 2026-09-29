export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isDestinationCompatible } from '@/lib/pooling/geography';
import { RideStatus } from '@prisma/client';

export async function POST(req: NextRequest, { params }: { params: { ride_id: string } }) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'DRIVER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const rideId = parseInt(params.ride_id, 10);
    if (isNaN(rideId)) return NextResponse.json({ error: 'Invalid ride ID' }, { status: 400 });

    const prisma = getPrisma();
    const driverId = user.id;

    const result = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findFirst({ where: { driver_id: driverId } });
      if (!vehicle) throw new Error('Vehicle not found');
      
      const locked = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM "Vehicle" WHERE id = ${vehicle.id} FOR UPDATE SKIP LOCKED`;
      if (!locked.length) throw new Error('Vehicle is busy, try again');
      
      const ride = await tx.rideRequest.findUnique({ where: { id: rideId } });
      if (!ride || ride.status !== 'REQUESTED' || ride.pool_id !== null) {
         throw new Error('Ride is no longer available');
      }

      const activeRideWhere = { status: { notIn: [RideStatus.CANCELLED, RideStatus.COMPLETED] } };
      const waitingStatuses: RideStatus[] = [RideStatus.REQUESTED, RideStatus.MATCHED];

      let pool = await tx.pool.findFirst({
        where: { vehicle_id: vehicle.id, status: 'ACTIVE' },
        include: { rideRequests: { where: activeRideWhere } },
      });

      if (pool) {
        const rides = pool.rideRequests;
        if (rides.some(r => !waitingStatuses.includes(r.status) || r.pickup_zone !== ride.pickup_zone)) {
          throw new Error('Incompatible with current pool status or pickup zone');
        }
        if (rides.length && !isDestinationCompatible(ride.pickup_zone, rides.map(r => r.destination_zone), ride.destination_zone)) {
          throw new Error('Destination not compatible');
        }
        const currentSeats = rides.reduce((sum, r) => sum + r.seats_requested, 0);
        if (currentSeats + ride.seats_requested > vehicle.seat_capacity) {
           throw new Error('Not enough seat capacity');
        }
      } else {
        pool = await tx.pool.create({ data: { vehicle_id: vehicle.id } });
      }

      const updatedRide = await tx.rideRequest.update({
         where: { id: rideId },
         data: { pool_id: pool.id, status: 'ACCEPTED', accepted_at: new Date() }
      });
      return updatedRide;
    }, { maxWait: 10000, timeout: 15000 });

    return NextResponse.json({ success: true, ride: result });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Failed to accept ride' }, { status: 500 });
  }
}
