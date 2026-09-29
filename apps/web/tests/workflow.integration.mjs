import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const database = new URL(process.env.DATABASE_URL || 'http://missing');
assert.ok(['localhost', '127.0.0.1'].includes(database.hostname) && database.pathname === '/oitesla_test',
  'Integration tests require a local database named oitesla_test');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3107';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Refusing a remote test server');
const prisma = new PrismaClient();
const prefix = `integration-${Date.now()}`;
const password = 'local-test-password';
const accounts = [];

async function api(path, { token, body, method = body ? 'POST' : 'GET' } = {}) {
  const response = await fetch(`${origin}/api${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  return { status: response.status, data };
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.data));
  return response.data;
}
async function account(name, role) {
  const email = `${prefix}-${name}@example.test`;
  const created = await api('/auth/signup', { body: { email, name, password, role } });
  expectStatus(created, 201);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  accounts.push(user.id);
  expectStatus(await api('/auth/login', { body: { email, password: 'wrong-password' } }), 401);
  expectStatus(await api('/auth/login', { body: { email, password } }), 403);
  expectStatus(await api('/auth/verify', { body: { email, code: user.verify_code } }), 200);
  const session = expectStatus(await api('/auth/login', { body: { email: ` ${email.toUpperCase()} `, password } }), 200);
  return { ...session, email };
}
const rideBody = { pickup_zone: 'Banani', destination_zone: 'Mohakhali', seats_requested: 1, payment_method: 'CASH' };
const book = (user, extra = {}) => api('/rides', { token: user.token, body: { ...rideBody, ...extra } });
const cancel = (user, id) => api(`/rides/${id}/status`, { method: 'PATCH', token: user.token, body: { status: 'CANCELLED' } });
const transition = (driver, pool, status) => api(`/driver/pools/${pool}/status`, { method: 'PATCH', token: driver.token, body: { status } });

test('auth and ride workflow against an isolated database', async t => {
  try {
    await t.test('health checks the database; malformed login input returns 400', async () => {
      expectStatus(await api('/health'), 200);
      for (const body of [{}, [], null, { email: 123, password: [] }]) {
        expectStatus(await api('/auth/login', { method: 'POST', body }), 400);
      }
      const malformed = await fetch(`${origin}/api/auth/login`, { method: 'POST', body: '{' });
      assert.equal(malformed.status, 400);
    });
    const driver = await account('driver', 'DRIVER');
    const otherDriver = await account('other-driver', 'DRIVER');
    const passengers = await Promise.all(['p1', 'p2', 'p3'].map(name => account(name, 'PASSENGER')));
    const [p1, p2, p3] = passengers;
    const vehicle = await prisma.vehicle.findFirstOrThrow({ where: { driver_id: driver.user.id } });
    await t.test('driver has exactly one offline vehicle, even after concurrent logins', async () => {
      assert.equal(vehicle.status, 'OFFLINE');
      await Promise.all([1, 2].map(() => api('/auth/login', { body: { email: driver.email, password } })));
      assert.equal(await prisma.vehicle.count({ where: { driver_id: driver.user.id } }), 1);
      const status = expectStatus(await api('/driver/status', { token: driver.token }), 200);
      assert.equal(status.status, 'OFFLINE');
      expectStatus(await api('/driver/status', { token: driver.token, method: 'PATCH', body: { status: 'ONLINE' } }), 200);
      assert.equal(expectStatus(await api('/driver/status', { token: driver.token }), 200).status, 'ONLINE');
    });
    await t.test('verified accounts cannot be overwritten by signup', async () => {
      expectStatus(await api('/auth/signup', { body: { email: p1.email, name: 'overwrite', password, role: 'DRIVER' } }), 409);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: p1.user.id } })).role, 'PASSENGER');
    });
    await t.test('invalid ride parameters are rejected', async () => {
      for (const extra of [{ seats_requested: 0 }, { seats_requested: 1.5 }, { seats_requested: '2' },
        { pickup_zone: 'unknown' }, { destination_zone: 'Banani' }, { payment_method: 'unknown' }]) {
        expectStatus(await book(p1, extra), 400);
      }
    });
    await t.test('duplicate simultaneous bookings yield one active ride; cancellation frees the vehicle', async () => {
      const results = await Promise.all([book(p1), book(p1)]);
      assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
      const booking = results.find(r => r.status === 201).data;
      expectStatus(await cancel(p2, booking.ride.id), 403);
      expectStatus(await cancel(otherDriver, booking.ride.id), 403);
      expectStatus(await cancel(p1, booking.ride.id), 200);
      expectStatus(await cancel(p1, booking.ride.id), 200);
      assert.equal((await prisma.pool.findUniqueOrThrow({ where: { id: booking.pool_id } })).status, 'CANCELLED');
    });
    await t.test('last-seat race never exceeds capacity', async () => {
      const first = expectStatus(await book(p1, { seats_requested: 2 }), 201);
      const results = await Promise.all([book(p2), book(p3)]);
      assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
      const rides = await prisma.rideRequest.findMany({ where: { pool_id: first.pool_id } });
      assert.equal(rides.reduce((sum, ride) => sum + ride.seats_requested, 0), 3);
      for (const ride of rides) expectStatus(await cancel(passengers.find(p => p.user.id === ride.passenger_id), ride.id), 200);
    });
    await t.test('accepted pools reject late bookings; pool ownership and transition order are enforced', async () => {
      const booking = expectStatus(await book(p1), 201);
      expectStatus(await transition(otherDriver, booking.pool_id, 'ACCEPTED'), 404);
      expectStatus(await transition(driver, booking.pool_id, 'STARTED'), 400);
      expectStatus(await transition(driver, booking.pool_id, 'ACCEPTED'), 200);
      expectStatus(await book(p2), 409);
      expectStatus(await cancel(p1, booking.ride.id), 200);
    });
    await t.test('concurrent completion charges a wallet once and preserves completed rides', async () => {
      const beforePassenger = await prisma.user.findUniqueOrThrow({ where: { id: p1.user.id } });
      const beforeDriver = await prisma.user.findUniqueOrThrow({ where: { id: driver.user.id } });
      const booking = expectStatus(await book(p1, { payment_method: 'TESLA_PAY' }), 201);
      for (const status of ['ACCEPTED', 'DRIVER_ARRIVED', 'STARTED']) expectStatus(await transition(driver, booking.pool_id, status), 200);
      expectStatus(await cancel(p1, booking.ride.id), 400);
      const results = await Promise.all([transition(driver, booking.pool_id, 'COMPLETED'), transition(driver, booking.pool_id, 'COMPLETED')]);
      results.forEach(r => expectStatus(r, 200));
      const afterPassenger = await prisma.user.findUniqueOrThrow({ where: { id: p1.user.id } });
      const afterDriver = await prisma.user.findUniqueOrThrow({ where: { id: driver.user.id } });
      assert.equal(beforePassenger.wallet_balance - afterPassenger.wallet_balance, booking.ride.fare_amount);
      assert.equal(afterDriver.wallet_balance - beforeDriver.wallet_balance, booking.ride.fare_amount);
      expectStatus(await transition(driver, booking.pool_id, 'STARTED'), 400);
      assert.equal(expectStatus(await api('/passenger/rides/active', { token: p1.token }), 200), null);
      assert.ok(expectStatus(await api('/passenger/rides/history', { token: p1.token }), 200).some(ride => ride.id === booking.ride.id));
    });
    await t.test('insufficient wallet funds cannot create a ride', async () => {
      await prisma.user.update({ where: { id: p3.user.id }, data: { wallet_balance: 0 } });
      expectStatus(await book(p3, { payment_method: 'TESLA_PAY' }), 409);
    });
  } finally {
    const users = await prisma.user.findMany({ where: { email: { startsWith: prefix } }, select: { id: true } });
    const ids = users.map(user => user.id);
    await prisma.rideRequest.deleteMany({ where: { passenger_id: { in: ids } } });
    await prisma.pool.deleteMany({ where: { vehicle: { driver_id: { in: ids } } } });
    await prisma.vehicle.deleteMany({ where: { driver_id: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
});
