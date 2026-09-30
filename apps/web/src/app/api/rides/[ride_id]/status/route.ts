export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { apiError, HttpError, readJsonBody } from '@/lib/http-error';
import { cancelRide } from '@/lib/rides';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ride_id: string }> }) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'PASSENGER') throw new HttpError(403, 'Forbidden');
    if ((await readJsonBody(req)).status !== 'CANCELLED') throw new HttpError(403, 'Passengers can only cancel rides');
    const result = await cancelRide(getPrisma(), user.id, Number((await params).ride_id));
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiError(error, 'Unable to update your ride. Please try again.');
  }
}
