import { simpleGit } from 'simple-git';
import { AgentRuntime } from './AgentRuntime.js';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

/**
 * ParallelTaskRunner
 * 
 * Manages the "Arena" for agent evolution.
 * Uses Git Worktrees to provide isolated filesystems for parallel execution.
 */
export class ParallelTaskRunner {
    private git = simpleGit();
    private worktreesRoot = path.join(process.cwd(), '.worktrees');

    constructor() {
        // Ensure worktrees dir exists
        fs.mkdir(this.worktreesRoot, { recursive: true }).catch(() => {});
    }

    /**
     * Spawns an Agent in an isolated worktree and executes a task.
     */
    async runInIsolation(
        taskId: string, 
        variantId: string, 
        taskPrompt: string,
        systemPrompt: string
    ) {
        const uniqueId = `${taskId}_${variantId}_${randomUUID().slice(0,4)}`;
        const worktreePath = path.join(this.worktreesRoot, uniqueId);
        const branchName = `evo/${uniqueId}`;

        console.log(`[ParallelRunner] 🏗️ Preparing Arena: ${worktreePath}`);

        try {

            // 1. Create Isolation (Git Worktree)
            // We create a new branch off main for this run
            await this.git.raw(['worktree', 'add', '-b', branchName, worktreePath, 'main']); // Assuming based on 'main'

            // 2. Initialize Agent Runtime in the worktree
            // Note: We run as 'Worker' tier to allow execution
            const runtime = await AgentRuntime.create(worktreePath, ['read_file', 'write_file', 'execute_task_logic'], 'Worker');

            // 3. Inject System Prompt (Identity)
            // We wrap the generate logic to include our specific persona
            // But AgentRuntime.runAgentLoop takes "userGoal". System prompt is usually fixed or strictly configured.
            // We might need to subclass or pass context.
            // For now, we prepend the identity to the task prompt as a workaround if Runtime doesn't expose system prompt easily,
            // OR we rely on `runtime.generateWithContext` if we had access.
            // Actually, `AgentRuntime` init sets up clients.
            // We will pass the Identity instruction as part of the "User Goal" wrapper for now, 
            // or better, we strictly define it in the agent.service usage.
            // Let's assume we pass it in the prompt for this implementation phase.
            const fullPrompt = `${systemPrompt}\n\nTASK: ${taskPrompt}`;

            // 4. Execute
            const result = await runtime.runAgentLoop(fullPrompt, "", async (prompt) => {
                 // Mocking the callback - AgentRuntime expects a callback to "regenerate" (call LLM).
                 // We need a real LLM here.
                 // We should use `VolcanoAgent` or `ProviderManager` to perform the generation.
                 // This requires coupling.
                 // Ideally `AgentRuntime` should have a default generator.
                 
                 // Needed: A way to call LLM.
                 // We'll import ProviderManager.
                 const { ProviderManager } = await import('./ProviderManager.js');
                 const provider = ProviderManager.getProvider('openai'); // Defaulting for now
                 if (!provider) throw new Error("No provider for runner");
                 
                 const response = await provider.generateCompletion({
                     modelId: 'gpt-4o',
                     messages: [{ role: 'user', content: prompt }],
                     max_tokens: 4096
                 });
                 return response.text;
            });

            return {
                output: result.result,
                logs: result.logs,
                worktreePath, // Return path so Assessor can check files
                exitCode: 0 
            };

        } catch (error) {
            console.error(`[ParallelRunner] ❌ Execution Failed for ${variantId}`, error);
            return {
                output: "",
                logs: [],
                worktreePath,
                exitCode: 1,
                error: String(error)
            };
        }
        // Note: We do NOT cleanup yet! 
        // The Assessor needs to inspect the files in `worktreePath`.
        // Cleanup happens after assessment.
    }

    /**
     * Nuke the worktree and branch
     */
    async cleanup(worktreePath: string) {
        if (!worktreePath.includes('.worktrees')) return; // Safety check
        
        console.log(`[ParallelRunner] 🧹 Cleaning up ${worktreePath}`);
        try {
            await this.git.raw(['worktree', 'prune']); // Prune internal tracking
            await fs.rm(worktreePath, { recursive: true, force: true });
            
            // Should verify if branch deletion is needed or if worktree remove handled it.
            // simple-git worktree remove might be better if supported, but prune + rm is robust.
            // We also want to delete the branch `evo/...` to keep git clean.
            // Extract branch name from path?
            // This is tricky without storing state.
            // We'll leave branch cleanup for a cron or 'prune' job for now to avoid errors.
        } catch (e: unknown) {
            console.warn(`[ParallelRunner] Cleanup warning: ${String(e)}`);
        }
    }
}
