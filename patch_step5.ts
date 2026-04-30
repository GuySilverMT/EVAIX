import * as fs from 'fs';

const filePath = 'apps/api/src/services/tooling/ExecutionStrategies.ts';
let code = fs.readFileSync(filePath, 'utf-8');

const ensembleStrategy = `
export class EnsemblePairStrategy implements IExecutionStrategy {
  public name = "EnsemblePairStrategy";

  static canHandle(response: string): boolean {
    // Specifically triggered for shadow assessments or when multiple models are requested.
    // For now we'll match a specific JSON wrapper or assume the orchestrator routes here directly.
    return response.includes('__ENSEMBLE_EXECUTION__');
  }

  canHandle(response: string): boolean {
    return EnsemblePairStrategy.canHandle(response);
  }

  async execute(response: string, context: AgentContext): Promise<ExecutionResult> {
    const { ParallelTaskRunner } = await import("../ParallelTaskRunner.js");
    const { prisma } = await import("../../db.js");

    // Parse ensemble args from response
    // expected format: { type: '__ENSEMBLE_EXECUTION__', models: ['veteran-id', 'rookie-id'], taskPrompt: '...', systemPrompt: '...' }
    let parsed: any;
    try {
        parsed = JSON.parse(response);
    } catch (e) {
        return { output: "Error: Invalid ensemble payload.", logs: [] };
    }

    const { models, taskPrompt, systemPrompt } = parsed;
    if (!models || models.length < 2) {
        return { output: "Error: Ensemble requires at least two models.", logs: [] };
    }

    const runner = new ParallelTaskRunner();

    // Check calibration of rookie (the second model usually, or check all)
    const rookieModelId = models[1];
    const rookieModel = await prisma.model.findUnique({ where: { id: rookieModelId }});

    let rookieSystemPrompt = systemPrompt;
    if (rookieModel && !rookieModel.isCalibrated) {
        rookieSystemPrompt += "\\n\\nSHADOW DIRECTIVE: Append a JSON block wrapped in [AUDIT] tags containing {'complexity': number, 'notes': string}. Failure to include [AUDIT] results in termination.";
    }

    // Execute in parallel
    const [veteranResult, rookieResult] = await Promise.all([
        runner.runInIsolation('ensemble-task', 'veteran', taskPrompt, systemPrompt),
        runner.runInIsolation('ensemble-task', 'rookie', taskPrompt, rookieSystemPrompt)
    ]);

    // Split rookie output
    const rookieAudit = splitAuditData(rookieResult.output);
    rookieResult.output = rookieAudit.cleanOutput;

    // Report results (veteran's output is primary, rookie's is graded out-of-band)
    const { AssessmentService } = await import("../AssessmentService.js");
    const assessor = new AssessmentService();

    // Let's pass the modelId through variantId param for now (or a new method)
    // Wait, the prompt says "gradeShadowAssessment(cleanOutput: string, auditData: string | null)". We'll call that.
    await assessor.gradeShadowAssessment(rookieModelId, rookieAudit.cleanOutput, rookieAudit.auditData);

    return {
        output: veteranResult.output,
        logs: [
            ...veteranResult.logs,
            "[Shadow Execution Completed]",
            ...rookieResult.logs
        ]
    };
  }
}

export function splitAuditData(output: string): { cleanOutput: string, auditData: string | null } {
    const auditRegex = /\\[AUDIT\\]([\\s\\S]*?)\\[\\/AUDIT\\]|\\[AUDIT\\]([\\s\\S]*?)$/;
    const match = output.match(auditRegex);
    if (!match) {
        return { cleanOutput: output, auditData: null };
    }
    const auditData = match[1] || match[2];
    const cleanOutput = output.replace(auditRegex, '').trim();
    return { cleanOutput, auditData: auditData.trim() };
}
`;

if (!code.includes('EnsemblePairStrategy')) {
    code += '\n' + ensembleStrategy;
    fs.writeFileSync(filePath, code);
    console.log('Patched ExecutionStrategies.ts');
} else {
    console.log('EnsemblePairStrategy already exists');
}
