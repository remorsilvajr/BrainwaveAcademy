import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type GlobalPrisma = typeof globalThis & {
    prisma?: PrismaClient;
};

const globalPrisma = globalThis as GlobalPrisma;

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

export const prisma =
    globalPrisma.prisma ??
    new PrismaClient({
        adapter,
    });

if (process.env.NODE_ENV !== "production") {
    globalPrisma.prisma = prisma;
}