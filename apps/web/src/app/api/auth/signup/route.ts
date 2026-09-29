export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { getPrisma } from '@/lib/prisma';

import { randomInt } from 'node:crypto';
import { apiError, HttpError, readJsonBody } from '@/lib/http-error';
import { checkEmailConfiguration, sendVerificationEmail } from '@/lib/verification-email';

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody(req);
    if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
        typeof body.password !== 'string' || body.password.length < 8 || Buffer.byteLength(body.password) > 72 ||
        typeof body.name !== 'string' || !body.name.trim()) {
      throw new HttpError(400, 'Enter a valid email, name, and a password of at least 8 characters (maximum 72 bytes)');
    }
    if (body.role !== 'PASSENGER' && body.role !== 'DRIVER') throw new HttpError(400, 'Invalid role');
    checkEmailConfiguration();
    const email = body.email.trim().toLowerCase();
    const role = body.role;
    const prisma = getPrisma();
    const password_hash = await bcrypt.hash(body.password, 10);
    const verify_code = randomInt(100000, 1000000).toString();
    const data = {
      email, name: body.name.trim(), password_hash, role,
      is_verified: false, verify_code, verify_expires: new Date(Date.now() + 10 * 60 * 1000),
      wallet_balance: role === 'PASSENGER' ? 100000 : 50000,
    } satisfies Prisma.UserCreateInput;
    // Serialize retries for the same email, including the first account creation.
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${email}))::text`;
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing?.is_verified) throw new HttpError(409, 'User with this email already exists');
      await tx.user.upsert({ where: { email }, create: data, update: data });
    });
    // Serverless functions may stop after responding; delivery must finish first.
    await sendVerificationEmail(email, verify_code);

    return NextResponse.json({ message: 'Verification code sent to email', requiresVerification: true, email, role }, { status: 201 });
  } catch (error) {
    return apiError(error, 'Unable to create your account. Please try again.');
  }
}
