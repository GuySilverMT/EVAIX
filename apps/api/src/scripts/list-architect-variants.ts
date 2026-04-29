
import { prisma } from '../db.js';

async function main() {
    const variants = await prisma.roleVariant.findMany({
        where: { role: { name: 'Role Architect' } }
    });
    console.log(JSON.stringify(variants, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
