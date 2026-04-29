import { SandboxTool } from "../types.js";

export interface IMcpOrchestrator {
    prepareEnvironment(serverNames: string[]): Promise<void>;
    getToolsForSandbox(): Promise<SandboxTool[]>;
    shutdownAll(): Promise<void>;
}
