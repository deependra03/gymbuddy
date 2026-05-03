const { PrismaClient } = require('@prisma/client');

const globalForPrisma = global;

// When using Supabase's PgBouncer pooler (transaction mode), Prisma's named
// prepared statements cause "prepared statement already exists" errors because
// PgBouncer does not guarantee the same backend connection across requests.
// Appending ?pgbouncer=true disables prepared statements for the pooler URL,
// and connection_limit=1 prevents Prisma from opening more connections than
// PgBouncer can cleanly manage per instance.
function buildDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}pgbouncer=true&connection_limit=1`;
}

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: buildDatabaseUrl(),
    },
  },
});

globalForPrisma.prisma = prisma;

module.exports = prisma;
