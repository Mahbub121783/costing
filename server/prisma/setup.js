/**
 * One-shot deployment setup for cPanel.
 * Run via SSH: node prisma/setup.js
 *
 * Does NOT use the Prisma CLI (prisma generate / prisma db push).
 * cPanel CloudLinux blocks WebAssembly memory allocation which the Prisma CLI
 * requires for schema parsing. Instead we:
 *   1. Apply schema via raw SQL (pg module — pure JS, no WASM)
 *   2. Seed the admin user via the pre-generated PrismaClient (no WASM)
 */
const path = require('path');
const fs   = require('fs');

const serverDir = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(serverDir, '.env') });

(async () => {
  try {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) throw new Error('DATABASE_URL is missing — check server/.env');

    // ── Step 1: Apply schema SQL ──────────────────────────────────────────────
    console.log('\n── Step 1: Creating database tables ──');
    const { Client } = require('pg');
    const sql = fs.readFileSync(path.join(__dirname, 'create-tables.sql'), 'utf-8');

    const pgClient = new Client({ connectionString: DATABASE_URL });
    await pgClient.connect();
    await pgClient.query(sql);

    // ── Step 1b: Enum-value migrations ────────────────────────────────────────
    // `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block, so it
    // must NOT be part of the multi-statement create-tables.sql above. Each runs
    // as its own autocommit statement here. Idempotent via IF NOT EXISTS (PG12+);
    // the try/catch also tolerates older servers / already-present values.
    const enumMigrations = [
      `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPPLIER'`,
    ];
    for (const stmt of enumMigrations) {
      try { await pgClient.query(stmt); }
      catch (e) { console.log(`  (skip) ${stmt} — ${e.message}`); }
    }

    await pgClient.end();
    console.log('✓ Tables created / already exist');

    // ── Step 2: Seed admin user ────────────────────────────────────────────────
    console.log('\n── Step 2: Seeding admin user ──');
    const generatedPath = path.join(serverDir, 'generated');
    if (!fs.existsSync(generatedPath)) {
      throw new Error(
        'server/generated/ not found.\n' +
        'The Prisma Client must be generated on CI and deployed via FTP.\n' +
        'Ensure the CI workflow ran successfully and the generated/ folder was uploaded.'
      );
    }

    const { PrismaClient } = require('../generated');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL });

    const existing = await prisma.user.findUnique({ where: { email: 'admin@gcs.com' } });
    if (existing) {
      console.log('✓ Admin user already exists — skipping seed.');
    } else {
      const passwordHash = await bcrypt.hash('Admin@GCS2024!', 12);
      await prisma.user.create({
        data: { name: 'GCS Admin', email: 'admin@gcs.com', passwordHash, role: 'ADMIN' },
      });
      console.log('✓ Admin user created: admin@gcs.com  /  Admin@GCS2024!');
    }

    await prisma.$disconnect();
    console.log('\n✅ Setup complete. Click RESTART in cPanel Node.js App.');
  } catch (e) {
    console.error('\n❌ Setup FAILED:', e.message);
    process.exit(1);
  }
})();
