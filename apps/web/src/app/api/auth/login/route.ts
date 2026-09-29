export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPrisma } from '@/lib/prisma';
import { getJwtSecret } from '@/lib/server-config';
import { apiError, HttpError, readJsonBody } from '@/lib/http-error';
import { ensureDriverVehicle } from '@/lib/driver-vehicle';

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody(req);

    if (typeof body.email !== 'string' || !body.email.trim() || typeof body.password !== 'string' || !body.password) {
      throw new HttpError(400, 'Email and password are required');
    }
    const email = body.email.trim().toLowerCase();
    const password = body.password;
    const secret = getJwtSecret();
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.is_verified) {
      return NextResponse.json({ error: 'Please verify your email first', requiresVerification: true }, { status: 403 });
    }
    if (user.role === 'DRIVER') {
      await prisma.$transaction(tx => ensureDriverVehicle(tx, user.id));
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, secret, {
      expiresIn: '7d',
    });

    return NextResponse.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } }, { status: 200 });
  } catch (error) {
    return apiError(error, 'Sign-in is temporarily unavailable. Please try again later.');
  }
}
