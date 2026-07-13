import { prisma } from '../db.js';
import { RoleFactoryService } from './RoleFactoryService.js';
import { ParallelTaskRunner } from './ParallelTaskRunner.js';
import { AssessmentService } from './AssessmentService.js';
import { randomUUID } from 'crypto';

/**
 * EvolutionEngine (The Lab)
 * 
 * Orchestrates the "Survival of the Fittest" cycle.
 * 1. Spawns Variants
 * 2. Runs Parallel Blind Tests
 * 3. Assesses Results
 * 4. Declares Winners
 */
export class EvolutionEngine {
    private factory = new RoleFactoryService();
    private runner = new ParallelTaskRunner();
    private assessor = new AssessmentService();

    /**
     * Run an evolutionary experiment for a specific task.
     */
    async evolve(roleId: string, taskPrompt: string, domain: string = 'Backend') {
        const taskId = randomUUID();
        console.log(`[EvolutionEngine] 🧬 Starting Experiment ${taskId} for Role ${roleId}`);

        // 1. Fetch Role
        const role = await prisma.role.findUnique({ where: { id: roleId } });
        if (!role) throw new Error("Role not found");

        // 2. Generate Variants
        // Variant A: Baseline (Low Complexity)
        const variantA = await this.factory.createRoleVariant(roleId, {
            name: `${role.name}_A`,
            description: role.description || '',
            domain,
            complexity: 'LOW'
        });

        // Variant B: Challenger (High Complexity)
        const variantB = await this.factory.createRoleVariant(roleId, {
            name: `${role.name}_B`,
            description: role.description || '',
            domain,
            complexity: 'HIGH'
        });

        const variants = [variantA, variantB];
        
        // 3. Parallel Execution (The Race)
        console.log(`[EvolutionEngine] 🏎️ Starting Race: ${variantA.id} vs ${variantB.id}`);
        
        const results = await Promise.all(variants.map(async (v) => {
            // Parse Identity config
            const identity = v.identityConfig as any;
            const systemPrompt = identity.systemPromptDraft || `You are ${role.name}`;

            const runResult = await this.runner.runInIsolation(taskId, v.id, taskPrompt, systemPrompt);
            return { variant: v, runResult };
        }));

        // 4. Blind Assessment
        console.log(`[EvolutionEngine] ⚖️ Blind Assessment...`);
        
        for (const res of results) {
            // Mocking a "files modified" check by listing worktree
            // In reality, we'd diff against main, but for now we pass the list.
            const { runResult } = res;
            
            // Pass the worktree path so assessor *could* inspect files (if implemented)
            // For now, assessor just trusts the exit code/logs
            
             await this.assessor.assessVariant(
                res.variant.id, 
                taskId, 
                {
                    output: runResult.output,
                    exitCode: runResult.exitCode,
                    // We define "filesModified" vaguely here
                    filesModified: runResult.exitCode === 0 ? ['success.ts'] : [] 
                }, 
                domain
            );
            
            // Cleanup Worktree
            if (runResult.worktreePath) {
                await this.runner.cleanup(runResult.worktreePath);
            }
        }

        console.log(`[EvolutionEngine] 🏆 Experiment ${taskId} Complete.`);
        return taskId;
    }
}
