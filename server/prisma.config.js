require('dotenv').config();

/** @type {import('prisma/config').PrismaConfig} */
const config = {
  datasource: {
    url: process.env.DATABASE_URL,
  },
};

module.exports = { default: config };
