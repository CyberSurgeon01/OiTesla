export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'DRIVER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const prisma = getPrisma();
    
    const requests = await prisma.rideRequest.findMany({
      where: {
        status: 'REQUESTED',
        pool_id: null,
      },
      include: {
        passenger: { select: { name: true } }
      }
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Failed to fetch requests' }, { status: 500 });
  }
}
