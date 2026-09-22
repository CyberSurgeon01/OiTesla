import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { isDestinationCompatible } from './geography';
import { calculateFare } from '../fare/fare.calculator';
import { RideStatus, PoolStatus } from '@prisma/client';

export const requestRide = async (req: any, res: Response) => {
  try {
    const { pickup_zone, destination_zone, seats_requested = 1, payment_method = 'CASH' } = req.body;
    const passenger_id = req.user.id;

    if (!pickup_zone || !destination_zone || seats_requested < 1) {
      return res.status(400).json({ error: 'Invalid ride parameters' });
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

    res.status(201).json(result);
  } catch (error: any) {
    console.error(error);
    if (error.message.includes('No available vehicles') || error.message.includes('capacity')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to request ride' });
  }
};

export const updateRideStatus = async (req: any, res: Response) => {
  try {
    const { ride_id } = req.params;
    const { status } = req.body;
    const userRole = req.user.role;
    
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
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    if (userRole === 'PASSENGER' && ride.passenger_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    if (!validTransitions[ride.status].includes(status)) {
      return res.status(400).json({ error: `Invalid transition from ${ride.status} to ${status}` });
    }
    
    if (userRole === 'PASSENGER' && status !== RideStatus.CANCELLED) {
      return res.status(403).json({ error: 'Passengers can only transition status to CANCELLED' });
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
    
    res.json(updatedRide);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update ride status' });
  }
};

export const getMyActiveRide = async (req: any, res: Response) => {
  try {
    const passenger_id = req.user.id;
    const activeRide = await prisma.rideRequest.findFirst({
      where: { 
        passenger_id, 
        status: { notIn: [RideStatus.CANCELLED, RideStatus.COMPLETED] } 
      },
      include: { pool: { include: { vehicle: true } } },
      orderBy: { requested_at: 'desc' }
    });
    res.json(activeRide || null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch active ride' });
  }
};

export const getMyHistory = async (req: any, res: Response) => {
  try {
    const passenger_id = req.user.id;
    const history = await prisma.rideRequest.findMany({
      where: { 
        passenger_id, 
        status: { in: [RideStatus.COMPLETED, RideStatus.CANCELLED] } 
      },
      include: { pool: { include: { vehicle: true } } },
      orderBy: { requested_at: 'desc' }
    });
    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ride history' });
  }
};
