export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { apiError, HttpError } from '@/lib/http-error';
import { quoteFare, validateQuoteInput } from '@/lib/fare/pricing';

/**
 * Prices a prospective ride with the same server-side function that `requestRide`
 * uses to charge it, so the estimate and the booked fare cannot drift apart.
 * The booking endpoint re-prices independently and ignores whatever this returned.
 */
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== 'PASSENGER') throw new HttpError(403, 'Forbidden');

    const params = req.nextUrl.searchParams;
    const pickup = params.get('pickup');
    const destination = params.get('destination');
    const seats = Number(params.get('seats') ?? '1');

    const invalidQuote = validateQuoteInput(pickup, destination, seats);
    if (invalidQuote) throw new HttpError(400, invalidQuote);

    return NextResponse.json({ fare: quoteFare(pickup as string, destination as string, seats) });
  } catch (error) {
    return apiError(error, 'Unable to calculate the fare right now.');
  }
}