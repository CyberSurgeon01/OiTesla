const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const vehicles = await prisma.vehicle.findMany({ where: { status: 'ONLINE' } });
  console.log("Online Vehicles:");
  console.dir(vehicles, { depth: null });
}
main();
