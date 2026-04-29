import { terminalTools } from '../tools/terminal.js';


export interface PlaybookStep {
  id: string;
  command: string;
  dependsOn: string[];
  runInParallel: boolean;
}

export class PlaybookHaltedError extends Error {
  constructor(public failedStep: PlaybookStep, public errorLog: string) {
    super(`Playbook halted at step ${failedStep.id}: ${failedStep.command}`);
  }
}

export class TerminalPlaybookEngine {
  private completedSteps: Set<string> = new Set();
  private failedStep: PlaybookStep | null = null;
  private logs: string[] = [];

  /**
   * Executes a batch of terminal commands based on dependencies.
   */
  async execute(steps: PlaybookStep[]) {
    this.completedSteps.clear();
    this.failedStep = null;
    this.logs = [];

    const remainingSteps = [...steps];

    while (remainingSteps.length > 0 && !this.failedStep) {
      // Find steps that have all dependencies met
      const readySteps = remainingSteps.filter(step => 
        step.dependsOn.every(depId => this.completedSteps.has(depId))
      );

      if (readySteps.length === 0 && remainingSteps.length > 0) {
        throw new Error("Circular dependency detected or missing dependency in playbook.");
      }

      // Priority 1: Parallel steps
      const parallelGroup = readySteps.filter(s => s.runInParallel);
      if (parallelGroup.length > 0) {
        await Promise.all(parallelGroup.map(step => this.executeStep(step)));
        if (this.failedStep) break;
        
        parallelGroup.forEach(s => {
          this.completedSteps.add(s.id);
          const index = remainingSteps.indexOf(s);
          if (index > -1) remainingSteps.splice(index, 1);
        });
        
        // After parallel execution, we might have new ready steps, 
        // but we can also just continue the loop.
        continue; 
      }

      // Priority 2: Sequential steps (take the first one)
      const sequentialStep = readySteps.find(s => !s.runInParallel);
      if (sequentialStep) {
        await this.executeStep(sequentialStep);
        if (this.failedStep) break;
        
        this.completedSteps.add(sequentialStep.id);
        const index = remainingSteps.indexOf(sequentialStep);
        if (index > -1) remainingSteps.splice(index, 1);
      }
    }

    if (this.failedStep) {
        throw new PlaybookHaltedError(this.failedStep, this.logs[this.logs.length - 1]);
    }
    
    return { status: 'success', logs: this.logs };
  }

  private async executeStep(step: PlaybookStep) {
    console.log(`[TerminalPlaybook] 🏃 Running step ${step.id}: ${step.command}`);
    
    try {
      const result = await terminalTools.execute.handler({ command: step.command });
      
      const log = `[${step.id}] ${result.status.toUpperCase()}: ${step.command}\n${result.stdout}\n${result.stderr}`;
      this.logs.push(log);

      if (result.exitCode !== 0) {
        this.failedStep = step;
      }
    } catch (error: any) {
      const log = `[${step.id}] EXCEPTION: ${step.command}\n${error.message}`;
      this.logs.push(log);
      this.failedStep = step;
    }
  }
}
