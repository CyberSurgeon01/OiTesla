import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isDestinationCompatible } from '@/lib/pooling/geography';
import { calculateFare } from '@/lib/fare/fare.calculator';
import { RideStatus, PoolStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'PASSENGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { pickup_zone, destination_zone, seats_requested = 1, payment_method = 'CASH' } = await req.json();
    const passenger_id = user.id;

    if (!pickup_zone || !destination_zone || seats_requested < 1) {
      return NextResponse.json({ error: 'Invalid ride parameters' }, { status: 400 });
    }

    const fare_amount = calculateFare(pickup_zone, destination_zone, true); 

    const activePools = await prisma.pool.findMany({
      where: { status: PoolStatus.ACTIVE, vehicle: { status: 'ONLINE' } },
      include: { rideRequests: { where: { status: { notIn: [RideStatus.CANCELLED, RideStatus.COMPLETED] } } }, vehicle: true }
    });

    let matchedPoolId: number | null = null;
    let matchedVehicleId: number | null = null;

    for (const pool of activePools) {
      if (pool.rideRequests.length === 0) continue;
      
      const firstPickup = pool.rideRequests[0].pickup_zone;
      if (firstPickup !== pickup_zone) continue;

      const existingDests = pool.rideRequests.map(r => r.destination_zone);
      if (!isDestinationCompatible(pickup_zone, existingDests, destination_zone)) continue;

      const usedSeats = pool.rideRequests.reduce((sum, r) => sum + r.seats_requested, 0);
      if (usedSeats + seats_requested <= pool.vehicle.seat_capacity) {
        matchedPoolId = pool.id;
        matchedVehicleId = pool.vehicle_id;
        break;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      let poolToUse = matchedPoolId;
      let vehicleToUse = matchedVehicleId;

      if (poolToUse && vehicleToUse) {
        await tx.$queryRaw`SELECT * FROM "Vehicle" WHERE id = ${vehicleToUse} FOR UPDATE`;
        
        const pool = await tx.pool.findUnique({
          where: { id: poolToUse },
          include: { rideRequests: { where: { status: { notIn: [RideStatus.CANCELLED, RideStatus.COMPLETED] } } }, vehicle: true }
        });

        if (!pool || pool.status !== PoolStatus.ACTIVE) throw new Error('Pool is no longer active');
        
        const usedSeats = pool.rideRequests.reduce((sum, r) => sum + r.seats_requested, 0);
        if (usedSeats + seats_requested > pool.vehicle.seat_capacity) {
          poolToUse = null;
          vehicleToUse = null;
        }
      }

      if (!poolToUse) {
        const availableVehicles: any[] = await tx.$queryRaw`
          SELECT v.* FROM "Vehicle" v
          WHERE v.status = 'ONLINE' 
          AND NOT EXISTS (
            SELECT 1 FROM "Pool" p 
            WHERE p.vehicle_id = v.id AND p.status = 'ACTIVE'
          )
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;

        if (availableVehicles.length === 0) {
          throw new Error('No available vehicles found');
        }

        const vehicle = availableVehicles[0];
        
        if (seats_requested > vehicle.seat_capacity) {
          throw new Error('Requested seats exceed vehicle capacity');
        }

        const newPool = await tx.pool.create({
          data: { vehicle_id: vehicle.id, status: PoolStatus.ACTIVE }
        });

        poolToUse = newPool.id;
        vehicleToUse = vehicle.id;
      }

      const ride = await tx.rideRequest.create({
        data: {
          passenger_id,
          pool_id: poolToUse,
          pickup_zone,
          destination_zone,
          seats_requested,
          fare_amount,
          payment_method,
          status: RideStatus.REQUESTED
        }
      });

      return { ride, pool_id: poolToUse };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error(error);
    if (error.message && (error.message.includes('No available vehicles') || error.message.includes('capacity'))) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to request ride' }, { status: 500 });
  }
}
