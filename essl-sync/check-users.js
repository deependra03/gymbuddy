const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        esslEnrollNumber: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log('Recent users in database:');
    console.log('='.repeat(80));
    users.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Phone: ${user.phone}`);
      console.log(`Email: ${user.email}`);
      console.log(`ESSL Enroll: ${user.esslEnrollNumber}`);
      console.log(`Active: ${user.isActive}`);
      console.log(`Created: ${user.createdAt.toISOString()}`);
      console.log('-'.repeat(80));
    });

    // Test password verification
    const bcrypt = require('bcryptjs');
    const DEFAULT_PASSWORD = 'GymBuddy@123';
    
    console.log('\nTesting password verification for recent users:');
    console.log('='.repeat(80));
    
    for (const user of users) {
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true }
      });
      
      if (fullUser && fullUser.passwordHash) {
        const isValid = await bcrypt.compare(DEFAULT_PASSWORD, fullUser.passwordHash);
        console.log(`${user.name} (${user.phone}): Password valid = ${isValid}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
