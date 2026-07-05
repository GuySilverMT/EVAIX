const prisma = new PrismaClient();
console.log('Prisma keys:', Object.keys(prisma).filter(k => !k.startsWith('$')));
process.exit(0);
