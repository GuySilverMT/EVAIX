import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const tools = await prisma.tool.findMany({
        where: { isEnabled: true },
        select: { name: true, serverId: true }
    });
    console.log(JSON.stringify(tools, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
