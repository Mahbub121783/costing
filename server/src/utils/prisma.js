require('dotenv').config();
// Import from custom output path (generated on CI, deployed via FTP — no WASM on cPanel)
const { PrismaClient } = require('../../generated');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
