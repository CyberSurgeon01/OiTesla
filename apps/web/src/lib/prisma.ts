import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | null };

let prismaInstance: PrismaClient | null = null;

try {
  prismaInstance = globalForPrisma.prisma || new PrismaClient();
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaInstance;
} catch (e) {
  console.error("PRISMA INIT ERROR:", e);
}

export const prisma = prismaInstance as PrismaClient;
