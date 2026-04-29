import { Role, Model, Prisma, RoleTool, Tool } from "@prisma/client";

// Definition of the model creation DTO used throughout the API
export interface ModelDef {
  id: string;
  providerId: string;
  name?: string;
  costPer1k?: number;
  isFree?: boolean;
  providerData?: Record<string, unknown>;
  contextWindow?: number;
  hasVision?: boolean;
  hasReasoning?: boolean;
  hasCoding?: boolean;
}

export type RoleWithTools = Role & {
    tools: (RoleTool & {
        tool: Tool;
    })[];
};

export interface IAgentConfigRepository {
    getRole(roleId: string): Promise<RoleWithTools | null>;
    getEffectiveRole(roleId: string): Promise<RoleWithTools | null>;
    getModel(providerId: string, modelId: string): Promise<Model | null>;
    createModel(modelDef: ModelDef): Promise<Model>;

    createRole(data: Prisma.RoleCreateInput): Promise<Role>;
}
