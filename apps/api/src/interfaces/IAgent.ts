export interface IAgent {
    generate(userGoal: string): Promise<string>;
    getConfig(): {
        modelId: string;
        providerId: string;
        temperature: number;
        maxTokens: number;
    };
}
