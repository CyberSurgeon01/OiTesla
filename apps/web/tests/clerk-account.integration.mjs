import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { syncClerkAccount } from '../src/lib/clerk-account.ts';

const database = new URL(process.env.DATABASE_URL || 'http://missing');
assert.ok(['localhost', '127.0.0.1'].includes(database.hostname) && database.pathname === '/oitesla_test',
  'Integration tests require a local database named oitesla_test');
const prisma = new PrismaClient();
const prefix = `clerk-integration-${Date.now()}`;
const identity = name => ({ userId: `user_${prefix}_${name}`, name, email: `${prefix}-${name}@example.test` });

test('verified Google account synchronization', async t => {
  try {
    await t.test('first login needs a role before creating an account', async () => {
      const profile = identity('new');
      assert.equal(await syncClerkAccount(prisma, profile), null);
      assert.equal(await prisma.user.count({ where: { email: profile.email } }), 0);
    });
    await t.test('simultaneous driver sign-ins create one account and one offline vehicle', async () => {
      const profile = identity('driver');
      const results = await Promise.all([syncClerkAccount(prisma, profile, 'DRIVER'), syncClerkAccount(prisma, profile, 'DRIVER')]);
      assert.equal(results[0].id, results[1].id);
      assert.equal(results[0].wallet_balance, 50000);
      assert.equal(await bcrypt.compare(profile.userId, results[0].password_hash), false);
      const vehicles = await prisma.vehicle.findMany({ where: { driver_id: results[0].id } });
      assert.equal(vehicles.length, 1);
      assert.equal(vehicles[0].status, 'OFFLINE');
    });
    await t.test('existing drivers get a missing vehicle and retain their role and wallet', async () => {
      const profile = identity('existing');
      const original = await prisma.user.create({ data: { email: profile.email, name: profile.name, role: 'DRIVER', is_verified: true,
        password_hash: await bcrypt.hash(profile.userId, 10), wallet_balance: 4321 } });
      const synced = await syncClerkAccount(prisma, profile, 'PASSENGER');
      assert.equal(synced.id, original.id);
      assert.equal(synced.role, 'DRIVER');
      assert.equal(synced.wallet_balance, 4321);
      assert.equal(await prisma.vehicle.count({ where: { driver_id: original.id } }), 1);
      assert.equal(await bcrypt.compare(profile.userId, synced.password_hash), false);
    });
    await t.test('verified email owners replace unverified registration credentials', async () => {
      const profile = identity('unverified');
      const original = await prisma.user.create({ data: { email: profile.email, name: 'unverified name', role: 'DRIVER',
        password_hash: await bcrypt.hash('unverified-password', 10), verify_code: '123456', verify_expires: new Date() } });
      assert.equal(await syncClerkAccount(prisma, profile), null);
      const synced = await syncClerkAccount(prisma, profile, 'PASSENGER');
      assert.equal(synced.id, original.id);
      assert.equal(synced.name, profile.name);
      assert.equal(synced.role, 'PASSENGER');
      assert.equal(synced.is_verified, true);
      assert.equal(synced.verify_code, null);
      assert.equal(synced.verify_expires, null);
      assert.equal(synced.wallet_balance, 100000);
      assert.equal(await bcrypt.compare('unverified-password', synced.password_hash), false);
    });
  } finally {
    const users = await prisma.user.findMany({ where: { email: { startsWith: prefix } }, select: { id: true } });
    const ids = users.map(user => user.id);
    await prisma.vehicle.deleteMany({ where: { driver_id: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
});
