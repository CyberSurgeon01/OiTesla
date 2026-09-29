export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getPrisma } from '@/lib/prisma';
import { getJwtSecret } from '@/lib/server-config';
import { apiError, HttpError, readJsonBody } from '@/lib/http-error';
import { ensureDriverVehicle } from '@/lib/driver-vehicle';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await readJsonBody(req);
    if (typeof email !== 'string' || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      throw new HttpError(400, 'Email and a six-digit verification code are required');
    }
    const secret = getJwtSecret();
    const prisma = getPrisma();
    const user = await prisma.$transaction(async tx => {
      const normalizedEmail = email.trim().toLowerCase();
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${normalizedEmail}))::text`;
      const account = await tx.user.findUnique({ where: { email: normalizedEmail } });
      if (!account || account.verify_code !== code) throw new HttpError(400, 'Invalid verification code');
      if (account.is_verified) throw new HttpError(400, 'Email already verified');
      if (!account.verify_expires || account.verify_expires < new Date()) throw new HttpError(400, 'Verification code has expired');
      const updated = await tx.user.update({ where: { id: account.id }, data: {
        is_verified: true, verify_code: null, verify_expires: null,
      } });
      if (updated.role === 'DRIVER') await ensureDriverVehicle(tx, updated.id);
      return updated;
    });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, secret, { expiresIn: '7d' });
    return NextResponse.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
  } catch (error) {
    return apiError(error, 'Unable to verify your account. Please try again.');
  }
}
