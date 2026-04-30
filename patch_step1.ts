import * as fs from 'fs';

const filePath = 'apps/api/src/orchestrator/McpOrchestrator.ts';
let code = fs.readFileSync(filePath, 'utf-8');

const delegateLogic = `
  /**
   * Sub-agent delegation logic
   */
  async delegateTask(targetRoleId: string, taskContext: string, currentRoleId: string) {
    if (targetRoleId === currentRoleId) {
      throw new Error("Anti-Self-Recursion: Orchestrator cannot delegate task to its own exact Role ID.");
    }

    const { prisma } = await import('../db.js');
    const role = await prisma.role.findUnique({ where: { id: targetRoleId } });
    if (!role) {
      // automatically inject a call to the hire_specialist native tool
      return { tool: 'hire_specialist', args: { roleId: targetRoleId, context: taskContext } };
    }

    // Replace hardcoded model selection
    const { ModelSelectorBandit } = await import('../services/ModelSelectorBandit.js');
    const selectedModels = await ModelSelectorBandit.selectModelsForTask(taskContext);

    return { role, models: selectedModels };
  }
`;

if (!code.includes('delegateTask')) {
    code = code.replace(/}\s*export const mcpOrchestrator/, delegateLogic + '\n}\n\nexport const mcpOrchestrator');
    fs.writeFileSync(filePath, code);
    console.log('Patched McpOrchestrator.ts');
} else {
    console.log('delegateTask already exists');
}
