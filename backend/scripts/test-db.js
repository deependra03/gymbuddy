/**
 * Quick DB connection test. Run: node scripts/test-db.js
 */
require('dotenv').config();
const { PrismaClient } = require('../generated/prisma');

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    console.log('OK — database connection works (DATABASE_URL / pooler).');
  } catch (err) {
    console.error('FAIL —', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
