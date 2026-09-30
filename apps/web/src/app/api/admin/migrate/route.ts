export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

/**
 * Vercel runs `prisma generate && next build`, not `prisma migrate deploy`, so the live
 * database is only advanced by hitting this endpoint once after a deploy. Every statement
 * is ADD COLUMN IF NOT EXISTS so repeated calls are safe.
 *
 * Keep this in sync with prisma/migrations/. The booking route writes fare_breakdown and
 * returns full RideRequest rows (which select rating), so a column missing here breaks
 * booking and rating on the live site.
 */
export async function GET() {
  const prisma = getPrisma();
  const applied: string[] = [];
  const skipped: string[] = [];

  const statements: Array<[string, string]> = [
    ['RideRequest.rating', `ALTER TABLE "RideRequest" ADD COLUMN IF NOT EXISTS "rating" INTEGER;`],
    ['RideRequest.rating_comment', `ALTER TABLE "RideRequest" ADD COLUMN IF NOT EXISTS "rating_comment" TEXT;`],
    ['RideRequest.fare_breakdown', `ALTER TABLE "RideRequest" ADD COLUMN IF NOT EXISTS "fare_breakdown" JSONB;`],
  ];

  for (const [name, sql] of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      applied.push(name);
    } catch (e: any) {
      skipped.push(`${name}: ${e.message}`);
      console.log(`[ADMIN_MIGRATE] skipped ${name}:`, e.message);
    }
  }

  return NextResponse.json({
    success: skipped.length === 0,
    applied,
    skipped,
  });
}
