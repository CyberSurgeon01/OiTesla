import { PrismaClient } from '@prisma/client';
import { requireEnvironment } from './server-config';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Initialize inside request handlers so configuration failures return JSON.
export function getPrisma(): PrismaClient {
  requireEnvironment('DATABASE_URL');
  globalForPrisma.prisma ??= new PrismaClient();
  return globalForPrisma.prisma;
}
