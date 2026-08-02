const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const adapter = new PrismaPg({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

(async () => {
  try {
    await prisma.$connect();
    console.log('connected');
    const result = await prisma.user.findUnique({
      where: { email: 'does-not-exist@example.com' },
    });
    console.log(result);
  } catch (error) {
    console.error('ERROR');
    console.error(error);
    console.error('message=', error.message);
    console.error('code=', error.code);
    console.error('meta=', error.meta);
  } finally {
    await prisma.$disconnect();
  }
})();
