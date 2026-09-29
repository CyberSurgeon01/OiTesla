import { Prisma } from '@prisma/client';

export async function ensureDriverVehicle(tx: Prisma.TransactionClient, driverId: number) {
  // Lock the user so concurrent verification/login requests cannot create duplicates.
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${driverId} FOR UPDATE`;
  return await tx.vehicle.findFirst({ where: { driver_id: driverId } }) ??
    tx.vehicle.create({ data: { driver_id: driverId, name: 'Tesla', seat_capacity: 3, status: 'OFFLINE' } });
}
