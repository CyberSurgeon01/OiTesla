export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { apiError, HttpError, readJsonBody } from '@/lib/http-error';
import { transitionPool } from '@/lib/rides';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ pool_id: string }> }) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'DRIVER') throw new HttpError(403, 'Forbidden');
    const result = await transitionPool(getPrisma(), user.id, Number((await params).pool_id), (await readJsonBody(req)).status);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiError(error, 'Unable to update your ride. Please try again.');
  }
}
