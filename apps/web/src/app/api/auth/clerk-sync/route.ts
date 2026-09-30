import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getPrisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@/lib/server-config';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const authData = auth(); // Clerk's auth
    // @ts-ignore
    const userId = authData.userId || (await authData).userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return NextResponse.json({ error: 'No email found' }, { status: 400 });
    
    const name = clerkUser.fullName || clerkUser.firstName || 'User';

    const body = await req.json().catch(() => ({}));
    const { role } = body;

    const prisma = getPrisma();

    // Find in our DB
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      if (!role) {
        return NextResponse.json({ needsRole: true }, { status: 400 });
      }
      
      // Create user
      user = await prisma.user.create({
        data: {
          email,
          name,
          role,
          password_hash: await bcrypt.hash(userId, 10), // dummy password
          is_verified: true
        }
      });
    }

    // Generate custom JWT
    const token = jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    }, getJwtSecret(), { expiresIn: '7d' });

    return NextResponse.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
