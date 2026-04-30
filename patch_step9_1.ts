import * as fs from 'fs';

const filePath = 'apps/api/src/orchestrator/McpOrchestrator.ts';
let code = fs.readFileSync(filePath, 'utf-8');

code = code.replace(/const { ModelSelectorBandit } = await import\('\.\.\/services\/ModelSelectorBandit\.js'\);\s*const selectedModels = await ModelSelectorBandit\.selectModelsForTask\(taskContext\);/, `const { getBestModel } = await import('../services/modelManager.service.js');
    const selectedModels = [await getBestModel(), await getBestModel()]; // Mock ensemble selection since ModelSelectorBandit doesn't exist`);
fs.writeFileSync(filePath, code);
console.log('Fixed McpOrchestrator imports');
