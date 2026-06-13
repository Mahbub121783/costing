/**
 * One-shot deployment setup for cPanel.
 *
 * Run it any of these ways:
 *   - cPanel "Run JS script"  →  enter:  prisma/setup.js
 *   - cPanel Terminal         →  node prisma/setup.js
 *   - npm                     →  npm run setup
 *
 * It loads .env FIRST (so DATABASE_URL is in the environment no matter what
 * prisma.config resolves to), pushes the schema to PostgreSQL, then creates
 * the admin user if it does not already exist.
 */
const { execSync } = require('child_process');
const path = require('path');

const serverDir = path.join(__dirname, '..');

// Load env BEFORE anything else so child prisma processes inherit DATABASE_URL.
require('dotenv').config({ path: path.join(serverDir, '.env') });

function run(cmd) {
  console.log('\n▶ ' + cmd);
  execSync(cmd, { stdio: 'inherit', cwd: serverDir, env: process.env });
}

(async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is missing — check server/.env');
    }

    run('npx prisma generate');
    run('npx prisma db push --accept-data-loss --skip-generate');

    console.log('\nSchema is in sync. Seeding admin user...');
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

    const existing = await prisma.user.findUnique({ where: { email: 'admin@gcs.com' } });
    if (existing) {
      console.log('Admin user already exists — skipping.');
    } else {
      const passwordHash = await bcrypt.hash('Admin@GCS2024!', 12);
      await prisma.user.create({
        data: { name: 'GCS Admin', email: 'admin@gcs.com', passwordHash, role: 'ADMIN' },
      });
      console.log('Admin user created: admin@gcs.com');
    }

    await prisma.$disconnect();
    console.log('\nSetup complete. Restart the Node.js app now.');
  } catch (e) {
    console.error('\nSetup FAILED:', e.message);
    process.exit(1);
  }
})();
