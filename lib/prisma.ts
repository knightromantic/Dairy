import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // 连接池：限制并发连接数，避免耗尽 Neon 免费配额
    datasourceUrl: process.env.DATABASE_URL,
    // Neon serverless 友好配置：连接超时和池化
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
