export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse('OiTesla API is running!', { status: 200 });
}
