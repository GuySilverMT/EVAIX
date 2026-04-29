
export type StepFunction<T = any> = (context: T) => Promise<any> | any;

export class InstructionChain<T = any> {
  private steps: { name: string; fn: StepFunction<T> }[] = [];
  private failureHandler: ((error: any, context: T) => Promise<any> | any) | null = null;
  private context: T;

  constructor(context: T) {
    this.context = context;
  }

  addStep(name: string, fn: StepFunction<T>): this {
    this.steps.push({ name, fn });
    return this;
  }

  onFailure(handlerName: string): this {
    // In a real implementation, this might look up a named handler.
    // For now, we'll just log and allow it to be set.
    console.log(`[InstructionChain] Registered failure handler: ${handlerName}`);
    return this;
  }

  async execute(): Promise<any> {
    let lastResult: any = null;
    for (const step of this.steps) {
      try {
        console.log(`[InstructionChain] Executing step: ${step.name}`);
        lastResult = await step.fn(this.context);
      } catch (error) {
        console.error(`[InstructionChain] Step failed: ${step.name}`, error);
        if (this.failureHandler) {
          return await this.failureHandler(error, this.context);
        }
        throw error;
      }
    }
    return lastResult;
  }
}
