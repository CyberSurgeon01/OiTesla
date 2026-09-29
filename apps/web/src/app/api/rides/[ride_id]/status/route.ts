import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { RideStatus } from '@prisma/client';

export async function PATCH(req: NextRequest, { params }: { params: { ride_id: string } }) {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ride_id = params.ride_id;
    const { status } = await req.json();
    const userRole = user.role;
    
    const validTransitions: Record<string, string[]> = {
      [RideStatus.REQUESTED]: [RideStatus.MATCHED, RideStatus.ACCEPTED, RideStatus.CANCELLED],
      [RideStatus.MATCHED]: [RideStatus.ACCEPTED, RideStatus.CANCELLED],
      [RideStatus.ACCEPTED]: [RideStatus.DRIVER_ARRIVED, RideStatus.CANCELLED],
      [RideStatus.DRIVER_ARRIVED]: [RideStatus.STARTED, RideStatus.CANCELLED],
      [RideStatus.STARTED]: [RideStatus.COMPLETED],
      [RideStatus.COMPLETED]: [],
      [RideStatus.CANCELLED]: []
    };

    const ride = await prisma.rideRequest.findUnique({ where: { id: parseInt(ride_id) } });
    if (!ride) return NextResponse.json({ error: 'Ride not found' }, { status: 404 });

    if (userRole === 'PASSENGER' && ride.passenger_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (!validTransitions[ride.status].includes(status)) {
      return NextResponse.json({ error: `Invalid transition from ${ride.status} to ${status}` }, { status: 400 });
    }
    
    if (userRole === 'PASSENGER' && status !== RideStatus.CANCELLED) {
      return NextResponse.json({ error: 'Passengers can only transition status to CANCELLED' }, { status: 403 });
    }

    const updateData: any = { status };
    if (status === RideStatus.MATCHED) updateData.matched_at = new Date();
    if (status === RideStatus.ACCEPTED) updateData.accepted_at = new Date();
    if (status === RideStatus.DRIVER_ARRIVED) updateData.arrived_at = new Date();
    if (status === RideStatus.STARTED) updateData.started_at = new Date();
    if (status === RideStatus.COMPLETED) updateData.completed_at = new Date();
    if (status === RideStatus.CANCELLED) updateData.cancelled_at = new Date();

    const updatedRide = await prisma.rideRequest.update({
      where: { id: parseInt(ride_id) },
      data: updateData
    });
    
    return NextResponse.json(updatedRide);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update ride status' }, { status: 500 });
  }
}
