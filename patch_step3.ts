import * as fs from 'fs';

const filePath = 'apps/api/src/orchestrator/McpOrchestrator.ts';
let code = fs.readFileSync(filePath, 'utf-8');

// The prompt asked us to:
// 1. In the sub-agent delegation logic, add an Anti-Self-Recursion guard: Throw an error if the Orchestrator tries to delegate a task to its own exact Role ID.
// 2. If the required role doesn't exist, automatically inject a call to the hire_specialist native tool to fetch it dynamically.
// 3. Replace hardcoded model selection with await ModelSelectorBandit.selectModelsForTask().

// I had already manually patched `delegateTask` into McpOrchestrator earlier but let's make sure it is exactly correct.

const target = `  async delegateTask(targetRoleId: string, taskContext: string, currentRoleId: string) {
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
  }`;

if (code.includes('Anti-Self-Recursion:')) {
    console.log('delegateTask already implemented');
} else {
    code = code.replace(/}\s*export const mcpOrchestrator/, target + '\n}\n\nexport const mcpOrchestrator');
    fs.writeFileSync(filePath, code);
    console.log('Patched McpOrchestrator');
}
