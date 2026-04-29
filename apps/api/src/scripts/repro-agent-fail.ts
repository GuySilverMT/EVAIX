import { AgentService } from '../services/agent.service.js';
import { prisma } from '../db.js';

async function main() {
    const agentService = new AgentService();

    // Find the the 'Role Architect' role
    const role = await prisma.role.findFirst({ where: { name: 'Role Architect' } });
    if (!role) throw new Error('Role Architect not found');

    // Find a card to use
    const card = await prisma.workOrderCard.findFirst();
    if (!card) throw new Error('No card found');

    console.log(`Starting session with Role: ${role.name} (${role.id}) on Card: ${card.id}`);

    try {
        const result = await agentService.startSession({
            roleId: role.id,
            cardId: card.id,
            userGoal: "Help me design a new role for a security researcher.",
            modelConfig: {
                temperature: 0.7,
                maxTokens: 2048
            },
            sessionId: "debug-session-123"
        });
        console.log("Success:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Caught expected error:", error);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
