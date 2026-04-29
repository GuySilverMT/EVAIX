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
}
