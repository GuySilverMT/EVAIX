
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
    console.log("🔍 Checking Roles and Categories...");

    const roleCount = await prisma.role.count();
    console.log(`Roles: ${roleCount}`);

    const categoryCount = await prisma.roleCategory.count();
    console.log(`Categories: ${categoryCount}`);

    const categories = await prisma.roleCategory.findMany();
    console.log("Categories found:", categories.map(c => c.name));

    const roles = await prisma.role.findMany({
        take: 5,
        include: { category: true }
    });

    console.log("\nSample Roles:");
    roles.forEach(r => {
        console.log(`- [${r.name}] (Category: ${r.category?.name || 'NULL'})`);
    });
}

checkData()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
