import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const role = await prisma.role.findFirst({
        where: { name: 'Role Architect' },
        include: {
            tools: { include: { tool: true } },
            variants: { where: { isActive: true } }
        }
    });
    console.log(JSON.stringify(role, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
