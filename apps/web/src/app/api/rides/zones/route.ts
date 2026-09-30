export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { HttpError, apiError } from '@/lib/http-error';
import { ZONES } from '@/lib/pooling/geography';

/** Serviceable zones. Served over HTTP so the booking form has a real loading state. */
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) throw new HttpError(401, 'Unauthorized');
    return NextResponse.json({ zones: ZONES });
  } catch (error) {
    return apiError(error, 'Unable to load zones right now.');
  }
}