import type { PrismaClient, Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { ensureDriverVehicle } from './driver-vehicle.ts';

/** Called only after the route verifies Clerk's session and primary email. */
export async function syncClerkAccount(
  prisma: PrismaClient,
  { userId, email, name }: { userId: string; email: string; name: string },
  role?: 'PASSENGER' | 'DRIVER',
) {
  // OAuth accounts have no usable password. Public provider IDs are not secrets.
  const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${email}))::text`;
    let account = await tx.user.findUnique({ where: { email } });
    if (!account || !account.is_verified) {
      // Discard unverified registration credentials when the email owner signs in.
      if (!role) return null;
      const data = {
        email, name, role, password_hash: passwordHash, is_verified: true,
        verify_code: null, verify_expires: null,
        wallet_balance: role === 'PASSENGER' ? 100000 : 50000,
      } satisfies Prisma.UserCreateInput;
      account = await tx.user.upsert({ where: { email }, create: data, update: data });
    }
    // Repair passwords assigned from public Clerk IDs by the previous bridge.
    if (await bcrypt.compare(userId, account.password_hash)) {
      account = await tx.user.update({ where: { id: account.id }, data: { password_hash: passwordHash } });
    }
    if (account.role === 'DRIVER') await ensureDriverVehicle(tx, account.id);
    return account;
  });
}
