export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'This maintenance endpoint has been removed' }, { status: 410 });
}
