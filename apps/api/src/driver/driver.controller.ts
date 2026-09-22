import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { VehicleStatus, RideStatus, PoolStatus, PaymentMethod } from '@prisma/client';

export const updateStatus = async (req: any, res: Response) => {
  try {
    const { status } = req.body;
    const driver_id = req.user.id;

    if (![VehicleStatus.ONLINE, VehicleStatus.OFFLINE].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

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

export const transitionPool = async (req: any, res: Response) => {
  try {
    const { pool_id } = req.params;
    const { status } = req.body;
    const driver_id = req.user.id;

    const vehicle = await prisma.vehicle.findFirst({ where: { driver_id } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const pool = await prisma.pool.findFirst({
      where: { id: parseInt(pool_id), vehicle_id: vehicle.id, status: PoolStatus.ACTIVE },
      include: { rideRequests: { where: { status: { notIn: [RideStatus.CANCELLED] } } } }
    });

    if (!pool) return res.status(404).json({ error: 'Active pool not found for this vehicle' });
    if (pool.rideRequests.length === 0) return res.status(400).json({ error: 'Pool is empty' });

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

    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    if (error.message.includes('Out of order')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to transition pool' });
  }
};

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
