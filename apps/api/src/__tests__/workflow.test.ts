import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role, VehicleStatus, PoolStatus, RideStatus } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123';

describe('Workflow & Rules Enforcement', () => {
  let driverToken: string;
  let passenger1Token: string;
  let passenger2Token: string;
  let poolId: number;
  let p1RideId: number;

  beforeAll(async () => {
    // Cleanup
    await prisma.rideRequest.deleteMany();
    await prisma.pool.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.user.deleteMany();

    // Basic setup
    const password_hash = await bcrypt.hash('testpass', 10);
    const driver = await prisma.user.create({ data: { email: 'd2@test.com', name: 'D', password_hash, role: Role.DRIVER } });
    driverToken = jwt.sign({ id: driver.id, email: driver.email, role: driver.role }, JWT_SECRET);

    await prisma.vehicle.create({ data: { driver_id: driver.id, name: 'V', seat_capacity: 3, status: VehicleStatus.ONLINE } });
    
    const p1 = await prisma.user.create({ data: { email: 'p12@test.com', name: 'P1', password_hash, role: Role.PASSENGER } });
    passenger1Token = jwt.sign({ id: p1.id, email: p1.email, role: p1.role }, JWT_SECRET);

    const p2 = await prisma.user.create({ data: { email: 'p22@test.com', name: 'P2', password_hash, role: Role.PASSENGER } });
    passenger2Token = jwt.sign({ id: p2.id, email: p2.email, role: p2.role }, JWT_SECRET);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('allows passenger 1 to request a ride', async () => {
    const res = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${passenger1Token}`)
      .send({ pickup_zone: 'Banani', destination_zone: 'Mohakhali', seats_requested: 1 });
    
    expect(res.status).toBe(201);
    poolId = res.body.pool_id;
    p1RideId = res.body.ride.id;
  });

  it('rejects invalid state transitions (e.g. STARTED before DRIVER_ARRIVED)', async () => {
    const res = await request(app)
      .patch(`/api/driver/pools/${poolId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: RideStatus.STARTED });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Out of order transition');
  });

  it('data isolation: passenger 2 cannot view or modify passenger 1 ride', async () => {
    // Passenger 2 tries to cancel passenger 1's ride
    const cancelRes = await request(app)
      .patch(`/api/rides/${p1RideId}/status`)
      .set('Authorization', `Bearer ${passenger2Token}`)
      .send({ status: RideStatus.CANCELLED });
    
    expect(cancelRes.status).toBe(403);
    expect(cancelRes.body.error).toBe('Forbidden');
  });

  it('cancellation rules hold (can cancel if REQUESTED/ACCEPTED, cannot cancel once STARTED)', async () => {
    // Driver advances state to ACCEPTED -> DRIVER_ARRIVED -> STARTED
    await request(app).patch(`/api/driver/pools/${poolId}/status`).set('Authorization', `Bearer ${driverToken}`).send({ status: RideStatus.ACCEPTED });
    await request(app).patch(`/api/driver/pools/${poolId}/status`).set('Authorization', `Bearer ${driverToken}`).send({ status: RideStatus.DRIVER_ARRIVED });
    await request(app).patch(`/api/driver/pools/${poolId}/status`).set('Authorization', `Bearer ${driverToken}`).send({ status: RideStatus.STARTED });

    // Passenger 1 tries to cancel after STARTED
    const lateCancelRes = await request(app)
      .patch(`/api/rides/${p1RideId}/status`)
      .set('Authorization', `Bearer ${passenger1Token}`)
      .send({ status: RideStatus.CANCELLED });
    
    expect(lateCancelRes.status).toBe(400);
    expect(lateCancelRes.body.error).toContain('Invalid transition');
  });

  it('prevents state transitions on a COMPLETED ride', async () => {
    // Finish ride
    await request(app).patch(`/api/driver/pools/${poolId}/status`).set('Authorization', `Bearer ${driverToken}`).send({ status: RideStatus.COMPLETED });

    // Driver tries to transition it again
    const invalidRes = await request(app)
      .patch(`/api/driver/pools/${poolId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: RideStatus.STARTED });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error).toContain('Out of order');
  });
});
