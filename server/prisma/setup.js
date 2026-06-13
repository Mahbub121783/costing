/**
 * One-shot deployment setup for cPanel.
 * Run via cPanel Node.js App → "Run JS script" → type: prisma/setup.js
 * Or: npm run setup
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const serverDir = path.join(__dirname, '..');

// Load .env first so DATABASE_URL is available to child processes
require('dotenv').config({ path: path.join(serverDir, '.env') });

// Use the LOCAL prisma binary (not npx which may find global/wrong version)
const prismaBin = path.join(serverDir, 'node_modules', '.bin', 'prisma');
const schemaPath = path.join(serverDir, 'prisma', 'schema.prisma');

function run(cmd) {
  console.log('\n▶ ' + cmd);
  execSync(cmd, {
    stdio: 'inherit',
    cwd: serverDir,
    env: { ...process.env },
  });
}

(async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is missing — check server/.env');
    }

    if (!fs.existsSync(prismaBin)) {
      throw new Error('Prisma binary not found at ' + prismaBin + ' — run npm install first');
    }

    console.log('Using schema:', schemaPath);
    console.log('Database:', process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@'));

    // generate: build the Prisma Client from schema
    run(`"${prismaBin}" generate --schema="${schemaPath}"`);

    // db push: sync the schema to PostgreSQL (creates tables)
    run(`"${prismaBin}" db push --accept-data-loss --schema="${schemaPath}"`);

    console.log('\nSchema synced. Seeding admin user...');

    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

    const existing = await prisma.user.findUnique({ where: { email: 'admin@gcs.com' } });
    if (existing) {
      console.log('Admin user already exists — skipping seed.');
    } else {
      const passwordHash = await bcrypt.hash('Admin@GCS2024!', 12);
      await prisma.user.create({
        data: { name: 'GCS Admin', email: 'admin@gcs.com', passwordHash, role: 'ADMIN' },
      });
      console.log('Admin user created: admin@gcs.com  /  password: Admin@GCS2024!');
    }

    await prisma.$disconnect();
    console.log('\n✅ Setup complete. Click RESTART in cPanel Node.js App.');
  } catch (e) {
    console.error('\n❌ Setup FAILED:', e.message);
    process.exit(1);
  }
})();
