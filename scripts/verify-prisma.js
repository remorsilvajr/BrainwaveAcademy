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
    console.log('prisma connected');

    const email = `test-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email,
        password: 'hashed-password',
      },
    });

    console.log('inserted user', user.id, user.email);
    await prisma.user.delete({ where: { id: user.id } });
    console.log('deleted test user');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
