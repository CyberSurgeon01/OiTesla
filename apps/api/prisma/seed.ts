import { PrismaClient, Role, VehicleStatus, RideStatus, PoolStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Create Driver (Jashim)
  const jashim = await prisma.user.upsert({
    where: { email: 'jashim@oitesla.com' },
    update: {},
    create: {
      email: 'jashim@oitesla.com',
      name: 'Jashim',
      password_hash: 'hashedpassword123',
      role: Role.DRIVER,
      wallet_balance: 50000,
    },
  });
  console.log(`Driver: ${jashim.name}`);

  // 2. Create Vehicle (Bullet)
  // Find vehicle first to avoid upserting without unique constraint on name/driver_id
  let bullet = await prisma.vehicle.findFirst({ where: { driver_id: jashim.id } });
  if (!bullet) {
    bullet = await prisma.vehicle.create({
      data: {
        driver_id: jashim.id,
        name: 'Bullet',
        seat_capacity: 3,
        status: VehicleStatus.ONLINE,
      }
    });
  } else {
    bullet = await prisma.vehicle.update({
      where: { id: bullet.id },
      data: { status: VehicleStatus.ONLINE }
    });
  }
  console.log(`Vehicle: ${bullet.name}`);

  // 3. Create Passengers
  const passengersData = [
    { name: 'Nusrat', email: 'nusrat@oitesla.com' },
    { name: 'Rafiq', email: 'rafiq@oitesla.com' },
    { name: 'Shirin', email: 'shirin@oitesla.com' },
  ];

  const passengers = [];
  for (const p of passengersData) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        name: p.name,
        password_hash: 'hashedpassword123',
        role: Role.PASSENGER,
        wallet_balance: 100000,
      },
    });
    passengers.push(user);
    console.log(`Passenger: ${user.name}`);
  }

  // 4. Create one completed ride in history for Nusrat (if not exists)
  const existingRide = await prisma.rideRequest.findFirst({
    where: { passenger_id: passengers[0].id, status: RideStatus.COMPLETED }
  });

  if (!existingRide) {
    const pastPool = await prisma.pool.create({
      data: {
        vehicle_id: bullet.id,
        status: PoolStatus.COMPLETED,
      }
    });

    await prisma.rideRequest.create({
      data: {
        passenger_id: passengers[0].id,
        pool_id: pastPool.id,
        pickup_zone: 'Banani',
        destination_zone: 'Mohakhali',
        seats_requested: 1,
        status: RideStatus.COMPLETED,
        fare_amount: 5000,
        requested_at: new Date(Date.now() - 3600000),
        matched_at: new Date(Date.now() - 3500000),
        accepted_at: new Date(Date.now() - 3400000),
        arrived_at: new Date(Date.now() - 3300000),
        started_at: new Date(Date.now() - 3200000),
        completed_at: new Date(Date.now() - 2000000),
      }
    });
    console.log(`Created completed ride for ${passengers[0].name}`);
  } else {
    console.log(`Completed ride already exists for ${passengers[0].name}`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
