import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role, VehicleStatus, PoolStatus } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123';

describe('Concurrency & Capacity Enforcement', () => {
  let driverToken: string;
  let nusratToken: string;
  let shirinToken: string;
  let vehicleId: number;

  beforeAll(async () => {
    // Cleanup
    await prisma.rideRequest.deleteMany();
    await prisma.pool.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.user.deleteMany();

    const password_hash = await bcrypt.hash('testpass', 10);

    // Create Driver Jashim
    const driver = await prisma.user.create({
      data: { email: 'jashim_test@oitesla.com', name: 'Jashim', password_hash, role: Role.DRIVER }
    });
    driverToken = jwt.sign({ id: driver.id, email: driver.email, role: driver.role }, JWT_SECRET);

    // Create Vehicle Bullet (Capacity 3)
    const vehicle = await prisma.vehicle.create({
      data: { driver_id: driver.id, name: 'Bullet Test', seat_capacity: 3, status: VehicleStatus.ONLINE }
    });
    vehicleId = vehicle.id;

    // Create Passenger Nusrat
    const nusrat = await prisma.user.create({
      data: { email: 'nusrat_test@oitesla.com', name: 'Nusrat', password_hash, role: Role.PASSENGER }
    });
    nusratToken = jwt.sign({ id: nusrat.id, email: nusrat.email, role: nusrat.role }, JWT_SECRET);

    // Create Passenger Shirin
    const shirin = await prisma.user.create({
      data: { email: 'shirin_test@oitesla.com', name: 'Shirin', password_hash, role: Role.PASSENGER }
    });
    shirinToken = jwt.sign({ id: shirin.id, email: shirin.email, role: shirin.role }, JWT_SECRET);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('seat capacity can never be exceeded (simulate Nusrat vs Shirin for the last seat)', async () => {
    // First, fill 2 seats using a dummy passenger to leave exactly 1 seat on Bullet
    const dummy = await prisma.user.create({
      data: { email: 'dummy@test.com', name: 'Dummy', password_hash: 'x', role: Role.PASSENGER }
    });
    const dummyToken = jwt.sign({ id: dummy.id, email: dummy.email, role: dummy.role }, JWT_SECRET);

    // Dummy takes 2 seats
    await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${dummyToken}`)
      .send({ pickup_zone: 'Banani', destination_zone: 'Mohakhali', seats_requested: 2 });

    // Now Bullet (capacity 3) has an ACTIVE pool with 2 seats used. 1 seat remaining.
    // Nusrat and Shirin both request 1 seat at the exact same time.
    const req1 = request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({ pickup_zone: 'Banani', destination_zone: 'Mohakhali', seats_requested: 1 });

    const req2 = request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${shirinToken}`)
      .send({ pickup_zone: 'Banani', destination_zone: 'Mohakhali', seats_requested: 1 });

    const [res1, res2] = await Promise.all([req1, req2]);

    // Expect exactly one to succeed in joining the same pool, and the other to either fail
    // or spawn a completely new vehicle/pool (which fails here because there are no other vehicles).
    
    // Check responses
    const statuses = [res1.status, res2.status];
    
    // One should be 201 (success), one should be 409 (conflict - No available vehicles found)
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);

    // Verify DB state: Total used seats on Bullet's active pool should be EXACTLY 3.
    const activePool = await prisma.pool.findFirst({
      where: { vehicle_id: vehicleId, status: PoolStatus.ACTIVE },
      include: { rideRequests: true }
    });

    const totalUsed = activePool!.rideRequests.reduce((sum, r) => sum + r.seats_requested, 0);
    expect(totalUsed).toBe(3); // 2 from dummy + 1 from the winner
  });
});
