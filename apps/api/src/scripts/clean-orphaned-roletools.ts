import { prisma } from '../db.js';

async function cleanOrphanedRoleTools() {
    console.log('🧹 Cleaning orphaned RoleTool records...');
    
    // Find all RoleTool records
    const roleTools = await prisma.roleTool.findMany();
    console.log(`Found ${roleTools.length} RoleTool records`);
    
    let deletedCount = 0;
    
    for (const rt of roleTools) {
        // Check if the tool exists
        const toolExists = await prisma.tool.findUnique({
            where: { id: rt.toolId }
        });
        
        if (!toolExists) {
            console.log(`❌ Deleting orphaned RoleTool: roleId=${rt.roleId}, toolId=${rt.toolId}`);
            await prisma.roleTool.delete({
                where: {
                    roleId_toolId: {
                        roleId: rt.roleId,
                        toolId: rt.toolId
                    }
                }
            });
            deletedCount++;
        }
    }
    
    console.log(`✅ Cleaned up ${deletedCount} orphaned RoleTool records`);
}

cleanOrphanedRoleTools()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
