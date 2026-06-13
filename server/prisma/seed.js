const { PrismaClient } = require('../generated');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@gcs.com' } });
  if (existing) {
    console.log('Admin user already exists — skipping seed.');
    return;
  }

  const passwordHash = await bcrypt.hash('Admin@GCS2024!', 12);
  const admin = await prisma.user.create({
    data: {
      name: 'GCS Admin',
      email: 'admin@gcs.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Admin user created:', admin.email);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
