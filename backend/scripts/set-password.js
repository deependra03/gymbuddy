/**
 * Set or reset a user's password by phone.
 * Usage: node scripts/set-password.js <phone> [newPassword]
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

async function main() {
  const phone = process.argv[2];
  const password = process.argv[3];

  if (!phone || !password) {
    console.error('Usage: node scripts/set-password.js <phone> <newPassword>');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { phone } });

  if (!existing) {
    console.error(`No user found with phone ${phone}. Create the member in admin first.`);
    process.exit(1);
  }

  const user = await prisma.user.update({
    where: { phone },
    data: { passwordHash },
    select: { id: true, name: true, phone: true, role: true },
  });

  console.log(`Password updated for ${user.name} (${user.phone}) — role: ${user.role}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
