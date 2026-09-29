import { PrismaClient, RideStatus } from '@prisma/client';
import { HttpError } from './http-error';
import { calculateFare } from './fare/fare.calculator';
import { ZONES, isDestinationCompatible } from './pooling/geography';

const activeRideWhere = { status: { notIn: [RideStatus.CANCELLED, RideStatus.COMPLETED] } };
const waitingStatuses: RideStatus[] = [RideStatus.REQUESTED, RideStatus.MATCHED];

export async function requestRide(prisma: PrismaClient, passengerId: number, body: Record<string, unknown>) {
  const { pickup_zone, destination_zone, seats_requested = 1, payment_method = 'CASH' } = body;
  if (typeof pickup_zone !== 'string' || typeof destination_zone !== 'string' ||
      !ZONES.includes(pickup_zone) || !ZONES.includes(destination_zone) || pickup_zone === destination_zone ||
      typeof seats_requested !== 'number' || !Number.isInteger(seats_requested) || seats_requested < 1 ||
      (payment_method !== 'CASH' && payment_method !== 'TESLA_PAY')) {
    throw new HttpError(400, 'Invalid ride parameters');
  }
  const fare_amount = calculateFare(pickup_zone, destination_zone);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${passengerId} FOR UPDATE`;
    const passenger = await tx.user.findUnique({ where: { id: passengerId } });
    if (!passenger || passenger.role !== 'PASSENGER') throw new HttpError(403, 'Forbidden');
    if (await tx.rideRequest.findFirst({ where: { passenger_id: passengerId, ...activeRideWhere } })) {
      throw new HttpError(409, 'You already have an active ride');
    }
    if (payment_method === 'TESLA_PAY' && passenger.wallet_balance < fare_amount) {
      throw new HttpError(409, 'Insufficient wallet balance');
    }
    const candidates = await tx.vehicle.findMany({
      where: { status: 'ONLINE', seat_capacity: { gte: seats_requested } },
      orderBy: { id: 'asc' }, select: { id: true },
    });
    for (const candidate of candidates) {
      // All booking, cancellation, and pool transitions serialize on this row.
      const locked = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM "Vehicle" WHERE id = ${candidate.id} FOR UPDATE SKIP LOCKED`;
      if (!locked.length) continue;
      const vehicle = await tx.vehicle.findUniqueOrThrow({ where: { id: candidate.id } });
      if (vehicle.status !== 'ONLINE') continue;
      let pool = await tx.pool.findFirst({
        where: { vehicle_id: vehicle.id, status: 'ACTIVE' },
        include: { rideRequests: { where: activeRideWhere } },
      });
      if (pool) {
        const rides = pool.rideRequests;
        if (rides.some(ride => !waitingStatuses.includes(ride.status) || ride.pickup_zone !== pickup_zone)) continue;
        if (rides.length && !isDestinationCompatible(pickup_zone, rides.map(ride => ride.destination_zone), destination_zone)) continue;
        if (rides.reduce((sum, ride) => sum + ride.seats_requested, 0) + seats_requested > vehicle.seat_capacity) continue;
      } else {
        pool = await tx.pool.create({ data: { vehicle_id: vehicle.id }, include: { rideRequests: true } });
      }
      const ride = await tx.rideRequest.create({ data: {
        passenger_id: passengerId, pool_id: pool.id, pickup_zone, destination_zone,
        seats_requested, payment_method, fare_amount, status: 'REQUESTED',
      } });
      return { ride, pool_id: pool.id };
    }
    throw new HttpError(409, 'No available vehicles found. Please try again.');
  }, { maxWait: 10000, timeout: 15000 });
}

const nextStatus: Partial<Record<RideStatus, RideStatus>> = {
  REQUESTED: 'ACCEPTED', MATCHED: 'ACCEPTED', ACCEPTED: 'DRIVER_ARRIVED',
  DRIVER_ARRIVED: 'STARTED', STARTED: 'COMPLETED',
};

export async function transitionPool(prisma: PrismaClient, driverId: number, poolId: number, status: unknown) {
  if (!Number.isInteger(poolId) || poolId < 1 || typeof status !== 'string' ||
      !['ACCEPTED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED'].includes(status)) {
    throw new HttpError(400, 'Invalid pool or status');
  }
  return prisma.$transaction(async tx => {
    const vehicle = await tx.vehicle.findFirst({ where: { driver_id: driverId } });
    if (!vehicle) throw new HttpError(404, 'Vehicle not found');
    await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${vehicle.id} FOR UPDATE`;
    const pool = await tx.pool.findFirst({
      where: { id: poolId, vehicle_id: vehicle.id },
      include: { rideRequests: { where: { status: { not: 'CANCELLED' } } } },
    });
    if (!pool) throw new HttpError(404, 'Pool not found for this vehicle');
    // A retry after a lost response must not repeat wallet transfers.
    if (pool.status === 'COMPLETED' && status === 'COMPLETED') return { success: true };
    if (pool.status !== 'ACTIVE' || !pool.rideRequests.length) throw new HttpError(400, 'Pool is no longer active');
    if (pool.rideRequests.every(ride => ride.status === status)) return { success: true };
    if (pool.rideRequests.some(ride => nextStatus[ride.status] !== status)) {
      throw new HttpError(400, 'Out of order transition');
    }
    const timestampField: Record<string, string> = {
      ACCEPTED: 'accepted_at', DRIVER_ARRIVED: 'arrived_at', STARTED: 'started_at', COMPLETED: 'completed_at',
    };
    const data = { status: status as RideStatus, [timestampField[status]]: new Date() };
    await tx.rideRequest.updateMany({ where: { id: { in: pool.rideRequests.map(ride => ride.id) } }, data });
    if (status === 'COMPLETED') {
      for (const ride of [...pool.rideRequests].sort((a, b) => a.passenger_id - b.passenger_id)) {
        if (ride.payment_method !== 'TESLA_PAY') continue;
        const paid = await tx.user.updateMany({
          where: { id: ride.passenger_id, wallet_balance: { gte: ride.fare_amount } },
          data: { wallet_balance: { decrement: ride.fare_amount } },
        });
        if (paid.count !== 1) throw new HttpError(409, 'Insufficient passenger wallet balance');
        await tx.user.update({ where: { id: driverId }, data: { wallet_balance: { increment: ride.fare_amount } } });
      }
      await tx.pool.update({ where: { id: pool.id }, data: { status: 'COMPLETED' } });
    }
    return { success: true };
  }, { maxWait: 10000, timeout: 15000 });
}

export async function cancelRide(prisma: PrismaClient, passengerId: number, rideId: number) {
  if (!Number.isInteger(rideId) || rideId < 1) throw new HttpError(400, 'Invalid ride ID');
  return prisma.$transaction(async tx => {
    const reference = await tx.rideRequest.findUnique({ where: { id: rideId }, include: { pool: true } });
    if (!reference) throw new HttpError(404, 'Ride not found');
    if (reference.passenger_id !== passengerId) throw new HttpError(403, 'Forbidden');
    if (reference.pool) await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${reference.pool.vehicle_id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "RideRequest" WHERE id = ${rideId} FOR UPDATE`;
    const ride = await tx.rideRequest.findUniqueOrThrow({ where: { id: rideId } });
    if (ride.status === 'CANCELLED') return ride;
    if (!['REQUESTED', 'MATCHED', 'ACCEPTED', 'DRIVER_ARRIVED'].includes(ride.status)) {
      throw new HttpError(400, `Invalid transition from ${ride.status} to CANCELLED`);
    }
    const updated = await tx.rideRequest.update({ where: { id: rideId }, data: { status: 'CANCELLED', cancelled_at: new Date() } });
    if (ride.pool_id && !await tx.rideRequest.count({ where: { pool_id: ride.pool_id, ...activeRideWhere } })) {
      await tx.pool.update({ where: { id: ride.pool_id }, data: { status: 'CANCELLED' } });
    }
    return updated;
  });
}
