export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export async function GET() {
  const prisma = getPrisma();
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "RideRequest" ADD COLUMN "rating" INTEGER;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "RideRequest" ADD COLUMN "rating_comment" TEXT;`);
  } catch (e: any) {
    console.log("Migration skipped or failed:", e.message);
  }
  return NextResponse.json({ success: true });
}
