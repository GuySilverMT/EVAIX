import { prisma } from '../db.js';

async function addMetaToolToRoleArchitect() {
    console.log('🔧 Adding meta tool to Role Architect variant...');
    
    const roleArchitect = await prisma.role.findUnique({
        where: { name: 'Role Architect' },
        include: { variants: { where: { isActive: true } } }
    });
    
    if (!roleArchitect) {
        console.error('❌ Role Architect not found');
        return;
    }
    
    const variant = roleArchitect.variants[0];
    if (!variant) {
        console.error('❌ No active variant found for Role Architect');
        return;
    }
    
    const cortex = variant.cortexConfig as Record<string, unknown>;
    const tools = (Array.isArray(cortex.tools) ? cortex.tools : []) as string[];
    
    if (!tools.includes('meta')) {
        tools.push('meta');
        console.log('➕ Adding meta to tools array');
        
        await prisma.roleVariant.update({
            where: { id: variant.id },
            data: {
                cortexConfig: {
                    ...cortex,
                    tools
                }
            }
        });
        
        console.log('✅ Successfully added meta tool to Role Architect');
    } else {
        console.log('ℹ️  meta tool already present in Role Architect');
    }
}

addMetaToolToRoleArchitect()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
