export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { apiError, HttpError, readJsonBody } from '@/lib/http-error';
import { requestRide } from '@/lib/rides';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'PASSENGER') throw new HttpError(403, 'Forbidden');
    const result = await requestRide(getPrisma(), user.id, await readJsonBody(req));
    console.log("[RIDE ASSIGNED] Ride:", result.ride.id, "Pool:", result.pool_id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(error, 'Unable to update your ride. Please try again.');
  }
}
