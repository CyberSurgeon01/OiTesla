import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { VehicleStatus, RideStatus, PoolStatus } from '@prisma/client';

// Toggle ONLINE / OFFLINE
export const updateStatus = async (req: any, res: Response) => {
  try {
    const { status } = req.body;
    const driver_id = req.user.id;

    if (![VehicleStatus.ONLINE, VehicleStatus.OFFLINE].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Assume one vehicle per driver for MVP
    const vehicle = await prisma.vehicle.findFirst({ where: { driver_id } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const updated = await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { status }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update vehicle status' });
  }
};

// See pending/active pools relevant to them
export const getActivePools = async (req: any, res: Response) => {
  try {
    const driver_id = req.user.id;
    const vehicle = await prisma.vehicle.findFirst({ where: { driver_id } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const pools = await prisma.pool.findMany({
      where: { 
        vehicle_id: vehicle.id, 
        status: PoolStatus.ACTIVE 
      },
      include: {
        rideRequests: {
          include: { passenger: { select: { name: true, id: true } } },
          orderBy: { requested_at: 'asc' }
        }
      }
    });

    res.json(pools);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch active pools' });
  }
};

// Transition pool status (affects all active rides)
export const transitionPool = async (req: any, res: Response) => {
  try {
    const { pool_id } = req.params;
    const { status } = req.body; // Target RideStatus for the pool's requests
    const driver_id = req.user.id;

    const vehicle = await prisma.vehicle.findFirst({ where: { driver_id } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const pool = await prisma.pool.findFirst({
      where: { id: parseInt(pool_id), vehicle_id: vehicle.id, status: PoolStatus.ACTIVE },
      include: { rideRequests: { where: { status: { notIn: [RideStatus.CANCELLED] } } } }
    });

    if (!pool) return res.status(404).json({ error: 'Active pool not found for this vehicle' });

    // Determine current overall state based on the first non-cancelled ride
    // In our model, all non-cancelled rides transition together.
    if (pool.rideRequests.length === 0) return res.status(400).json({ error: 'Pool is empty' });

    // Valid transitions
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

    // Use a transaction to update all relevant rides
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

      // If completing, also complete the pool
      if (status === RideStatus.COMPLETED) {
        await tx.pool.update({
          where: { id: pool.id },
          data: { status: PoolStatus.COMPLETED }
        });
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    if (error.message.includes('Out of order')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to transition pool' });
  }
};

// Driver sees their current passengers & history
export const getHistory = async (req: any, res: Response) => {
  try {
    const driver_id = req.user.id;
    const vehicle = await prisma.vehicle.findFirst({ where: { driver_id } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const history = await prisma.pool.findMany({
      where: { vehicle_id: vehicle.id, status: PoolStatus.COMPLETED },
      include: {
        rideRequests: {
          include: { passenger: { select: { name: true, id: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};
