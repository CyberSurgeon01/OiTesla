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
      password_hash: 'hashedpassword123', // dummy hash
      role: Role.DRIVER,
      wallet_balance: 50000, // 500 BDT
    },
  });
  console.log(`Created driver: ${jashim.name}`);

  // 2. Create Vehicle (Bullet)
  const bullet = await prisma.vehicle.upsert({
    where: { id: 1 }, // Assuming ID 1 for simplicity or we can check by name
    update: { status: VehicleStatus.ONLINE },
    create: {
      driver_id: jashim.id,
      name: 'Bullet',
      seat_capacity: 3,
      status: VehicleStatus.ONLINE,
    },
  });
  console.log(`Created vehicle: ${bullet.name}`);

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
        wallet_balance: 100000, // 1000 BDT
      },
    });
    passengers.push(user);
    console.log(`Created passenger: ${user.name}`);
  }

  // 4. Create one completed ride in history for Nusrat
  // Needs a Pool and a RideRequest
  const pastPool = await prisma.pool.create({
    data: {
      vehicle_id: bullet.id,
      status: PoolStatus.COMPLETED,
    }
  });

  const completedRide = await prisma.rideRequest.create({
    data: {
      passenger_id: passengers[0].id, // Nusrat
      pool_id: pastPool.id,
      pickup_zone: 'Banani',
      destination_zone: 'Mohakhali',
      seats_requested: 1,
      status: RideStatus.COMPLETED,
      fare_amount: 5000, // 50 BDT
      requested_at: new Date(Date.now() - 3600000), // 1 hour ago
      matched_at: new Date(Date.now() - 3500000),
      accepted_at: new Date(Date.now() - 3400000),
      arrived_at: new Date(Date.now() - 3300000),
      started_at: new Date(Date.now() - 3200000),
      completed_at: new Date(Date.now() - 2000000),
    }
  });
  console.log(`Created completed ride for ${passengers[0].name}`);

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
