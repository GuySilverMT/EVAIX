
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    // 1. Check if we can query the Role table at all
    const roleCount = await prisma.role.count();
    console.log(`Current Role Count: ${roleCount}`);

    if (roleCount > 0) {
      const firstRole = await prisma.role.findFirst();
      console.log('Sample Role:', firstRole);
    } else {
      console.log('No roles found in the database.');
    }

    // 2. Check for the 'category' column specifically using raw SQL
    // This helps us see if the DB schema matches the Prisma schema
    try {
        const result = await prisma.$queryRaw`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Role' AND column_name = 'category';
        `;
        console.log('Category column check:', result);
    } catch (e) {
        console.log('Could not check information_schema (might be permissions or table name casing).');
    }

  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
