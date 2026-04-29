
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const target = 'cmkd'; // Search for prefix
    console.log(`Brute force search for '${target}' in Role/RoleVariant...`);

    const roles = await prisma.role.findMany();
    const badRoles = roles.filter(r => JSON.stringify(r).includes(target));
    console.log(`Found in Role: ${badRoles.length}`);
    badRoles.forEach(r => console.log(`- Role: ${r.name}, ID: ${r.id}, Meta: ${JSON.stringify(r.metadata)}`));

    const variants = await prisma.roleVariant.findMany();
    const badVariants = variants.filter(v => JSON.stringify(v).includes(target));
    console.log(`Found in RoleVariant: ${badVariants.length}`);
    badVariants.forEach(v => console.log(`- Variant ID: ${v.id}, Role ID: ${v.roleId}, Cortex: ${JSON.stringify(v.cortexConfig)}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
