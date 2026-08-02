const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
console.log('Using connection string:', connectionString ? connectionString.replace(/:[^:@]+@/, ':***@') : 'none');

const adapter = new PrismaPg({ connectionString, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    await prisma.$connect();
    console.log('Connected');
    const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
    console.log('Result', user);
  } catch (error) {
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error code:', error?.code);
    console.error('Error meta:', error?.meta);
    console.error('Error stack:', error?.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
