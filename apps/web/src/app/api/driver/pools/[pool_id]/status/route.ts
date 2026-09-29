export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { PoolStatus, RideStatus, PaymentMethod } from '@prisma/client';

export async function PATCH(req: NextRequest, { params }: { params: { pool_id: string } }) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'DRIVER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const pool_id = params.pool_id;
    const { status } = await req.json();
    const driver_id = user.id;

    const vehicle = await prisma.vehicle.findFirst({ where: { driver_id } });
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

    const pool = await prisma.pool.findFirst({
      where: { id: parseInt(pool_id), vehicle_id: vehicle.id },
      include: { 
        vehicle: true,
        rideRequests: { where: { status: { notIn: [RideStatus.CANCELLED] } } } 
      }
    });

    if (!pool) return NextResponse.json({ error: 'Pool not found for this vehicle' }, { status: 404 });
    if (pool.status === PoolStatus.COMPLETED) return NextResponse.json({ error: 'Out of order transition: Pool is already COMPLETED' }, { status: 400 });
    if (pool.rideRequests.length === 0) return NextResponse.json({ error: 'Pool is empty' }, { status: 400 });

    const validTransitions: Record<string, string[]> = {
      [RideStatus.REQUESTED]: [RideStatus.ACCEPTED],
      [RideStatus.MATCHED]: [RideStatus.ACCEPTED],
      [RideStatus.ACCEPTED]: [RideStatus.DRIVER_ARRIVED],
      [RideStatus.DRIVER_ARRIVED]: [RideStatus.STARTED],
      [RideStatus.STARTED]: [RideStatus.COMPLETED],
    };

    const updateData: any = { status };
    const now = new Date();
    if (status === RideStatus.ACCEPTED) updateData.accepted_at = now;
    if (status === RideStatus.DRIVER_ARRIVED) updateData.arrived_at = now;
    if (status === RideStatus.STARTED) updateData.started_at = now;
    if (status === RideStatus.COMPLETED) updateData.completed_at = now;

    await prisma.$transaction(async (tx) => {
      for (const ride of pool.rideRequests) {
        if (!validTransitions[ride.status] || !validTransitions[ride.status].includes(status)) {
          throw new Error(`Out of order transition: Cannot transition from ${ride.status} to ${status}`);
        }
        await tx.rideRequest.update({
          where: { id: ride.id },
          data: updateData
        });
      }

      if (status === RideStatus.COMPLETED) {
        await tx.pool.update({
          where: { id: pool.id },
          data: { status: PoolStatus.COMPLETED }
        });

        // Deduct from wallet if passenger chose TESLA_PAY
        for (const ride of pool.rideRequests) {
          if (ride.payment_method === PaymentMethod.TESLA_PAY) {
            // Deduct from passenger
            await tx.user.update({
              where: { id: ride.passenger_id },
              data: { wallet_balance: { decrement: ride.fare_amount } }
            });
            // Credit to driver
            await tx.user.update({
              where: { id: driver_id },
              data: { wallet_balance: { increment: ride.fare_amount } }
            });
          }
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    if (error.message && error.message.includes('Out of order')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to transition pool' }, { status: 500 });
  }
}
