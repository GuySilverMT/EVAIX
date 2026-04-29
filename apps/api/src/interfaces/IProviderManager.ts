import { BaseLLMProvider, LLMModel } from "../utils/BaseLLMProvider.js";

export interface IProviderManager {
    initialize(): Promise<void>;
    getProvider(id: string): BaseLLMProvider | undefined;
    hasProvider(partialId: string): boolean;
    getAllModels(): Promise<LLMModel[]>;
    syncModelsToRegistry(): Promise<void>;
    markUnhealthy(providerId: string, cooldownSeconds: number): void;
    isHealthy(providerId: string): boolean;
}
