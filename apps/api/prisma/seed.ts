import { PrismaClient, Role, RideStatus, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = bcrypt.hashSync('hashedpassword123', 10);

  const jashim = await prisma.user.upsert({
    where: { email: 'jashim@oitesla.com' },
    update: { password_hash: hash },
    create: {
      email: 'jashim@oitesla.com',
      name: 'Jashim',
      password_hash: hash,
      role: Role.DRIVER,
      wallet_balance: 50000,
    },
  });
  console.log('Driver: Jashim');

  let bullet = await prisma.vehicle.findFirst({ where: { driver_id: jashim.id } });
  if (!bullet) {
    bullet = await prisma.vehicle.create({
      data: {
        driver_id: jashim.id,
        name: 'Bullet',
        seat_capacity: 3,
        status: 'ONLINE',
      },
    });
  }
  console.log('Vehicle: Bullet');

  const passengers = [
    { email: 'nusrat@oitesla.com', name: 'Nusrat' },
    { email: 'rafiq@oitesla.com', name: 'Rafiq' },
    { email: 'shirin@oitesla.com', name: 'Shirin' },
  ];

  for (const p of passengers) {
    await prisma.user.upsert({
      where: { email: p.email },
      update: { password_hash: hash },
      create: {
        email: p.email,
        name: p.name,
        password_hash: hash,
        role: Role.PASSENGER,
        wallet_balance: 100000,
      },
    });
    console.log(`Passenger: ${p.name}`);
  }

  // Generate example completed ride for Nusrat
  const nusrat = await prisma.user.findUnique({ where: { email: 'nusrat@oitesla.com' } });
  if (nusrat && bullet) {
    const existingRide = await prisma.rideRequest.findFirst({
      where: { passenger_id: nusrat.id, status: RideStatus.COMPLETED }
    });

    if (!existingRide) {
      const pool = await prisma.pool.create({
        data: {
          vehicle_id: bullet.id,
          status: 'COMPLETED',
        }
      });
      await prisma.rideRequest.create({
        data: {
          passenger_id: nusrat.id,
          pool_id: pool.id,
          pickup_zone: 'Banani',
          destination_zone: 'Mohakhali',
          seats_requested: 1,
          status: RideStatus.COMPLETED,
          fare_amount: 5000,
          payment_method: PaymentMethod.TESLA_PAY,
        }
      });
      console.log('Created completed ride for Nusrat');
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
