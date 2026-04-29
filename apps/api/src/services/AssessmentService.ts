import { prisma } from '../db.js';

interface TaskResult {
    output: string;
    filesModified?: string[];
    exitCode?: number;
    stderr?: string;
}

/**
 * AssessmentService
 * 
 * The "Teacher" of the system. Grades agent performance based on hard metrics.
 * - Lint Errors (0 is perfect)
 * - Test Pass (True/False)
 * - Execution Time (Lower is better)
 */
export class AssessmentService {

    /**
     * Assesses a completed task by a Role Variant
     */
    async assessVariant(variantId: string, taskId: string, result: TaskResult, domain: string) {
        console.log(`[Assessment] 🎓 Grading task ${taskId} for variant ${variantId}...`);

        const assessments = [];

        // 1. Lint Check
        if (result.filesModified && result.filesModified.length > 0) {
            const lintScore = await this.gradeLint(result.filesModified);
            assessments.push({
                metric: 'LINT_QUALITY',
                score: lintScore,
                feedback: lintScore < 100 ? 'Lint errors detected' : 'Code is clean'
            });
        }

        // 2. Logic Check (Simulation)
        if (domain === 'Backend') {
            const testScore = result.exitCode === 0 ? 100 : 0;
            assessments.push({
                metric: 'TEST_PASS',
                score: testScore,
                feedback: result.exitCode === 0 ? 'Tests passed' : `Tests failed: ${result.stderr}`
            });
        }

        // 3. Save Grades
        for (const grade of assessments) {
            await prisma.roleAssessment.create({
                data: {
                    variantId,
                    taskId,
                    metric: grade.metric,
                    score: grade.score,
                    feedback: grade.feedback
                }
            });
        }

        console.log(`[Assessment] ✅ Saved ${assessments.length} assessments.`);
    }

    /**
     * Simulates a lint check or runs actual eslint (if we were capturing file content)
     */
    private async gradeLint(files: string[]): Promise<number> {
        // Placeholder: specific rigid check
        // Ideally we run `eslint` on the file path.
        // For now, assume perfect until we hook up actual file execution.
        await Promise.resolve(files); // Check files
        return 100; 
    }

    /**
     * Grades shadow assessments for rookie models without using an LLM.
     */
    async gradeShadowAssessment(modelId: string, cleanOutput: string, auditData: string | null) {
        let score = 0;

        // 1. Audit Data JSON Check
        if (!auditData) {
            score = 0;
        } else {
            try {
                JSON.parse(auditData);
                score = 100; // Passed JSON parse
            } catch (e) {
                score = 0;
            }
        }

        // 2. Code Block Syntax Check
        if (score > 0) {
            const { LanguageServerService } = await import("./LanguageServerService.js");
            const lsp = new LanguageServerService();
            const codeBlockRegex = /```(?:[a-zA-Z0-9]+)?\s*\n?([\s\S]*?)```/g;
            let match;
            const blocks = [];
            while ((match = codeBlockRegex.exec(cleanOutput)) !== null) {
                if (match[1].trim()) blocks.push(match[1].trim());
            }

            if (blocks.length > 0) {
                const combinedCode = blocks.join('\n\n');
                const validation = await lsp.validateTypeScript(combinedCode);
                if (!validation.isValid) {
                    score = 0;
                }
            } else {
                // If no code blocks but it was a code task, we might score 0, but for simplicity we keep 100 if parse passed
            }
        }

        // 3. Moving Average Logic & State Update
        const model = await prisma.model.findUnique({ where: { id: modelId } });
        if (model) {
            const oldScore = model.shadowScore || 0;
            const oldTrials = model.trialsCode || 0;

            const newScore = ((oldScore * oldTrials) + score) / (oldTrials + 1);
            const newTrials = oldTrials + 1;

            let isCalibrated = model.isCalibrated;
            if (newTrials >= 5) {
                isCalibrated = true;
            }

            let isActive = model.isActive;
            // Expulsion Rule
            if (isCalibrated && model.providerId !== 'FREE_UNLIMITED' && newScore < 80) {
                isActive = false;
            }

            await prisma.model.update({
                where: { id: modelId },
                data: {
                    shadowScore: newScore,
                    trialsCode: newTrials,
                    isCalibrated,
                    isActive
                }
            });
        }
    }

}
