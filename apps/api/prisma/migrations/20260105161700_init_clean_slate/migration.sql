-- CreateTable
CREATE TABLE "ProviderConfig" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "baseURL" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rootPath" TEXT NOT NULL,
    "systemPrompt" TEXT,
    "codeRules" TEXT,
    "glossary" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerData" JSONB NOT NULL DEFAULT '{}',
    "aiData" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "costPer1k" DOUBLE PRECISION,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelCapabilities" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "contextWindow" INTEGER DEFAULT 4096,
    "maxOutput" INTEGER DEFAULT 4096,
    "hasVision" BOOLEAN NOT NULL DEFAULT false,
    "supportsFunctionCalling" BOOLEAN NOT NULL DEFAULT false,
    "supportsJsonMode" BOOLEAN NOT NULL DEFAULT false,
    "specs" JSONB DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelCapabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelUsage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usageMetrics" JSONB DEFAULT '{}',
    "responseHeaders" JSONB,
    "metadata" JSONB,

    CONSTRAINT "ModelUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrompt" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RoleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "schema" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleTool" (
    "roleId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,

    CONSTRAINT "RoleTool_pkey" PRIMARY KEY ("roleId","toolId")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "description" TEXT,
    "roleId" TEXT,
    "input" JSONB DEFAULT '{}',
    "output" JSONB,
    "logs" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeVector" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "vector" DOUBLE PRECISION[],
    "dimensions" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeVector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileIndex" (
    "filePath" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileIndex_pkey" PRIMARY KEY ("filePath")
);

-- CreateTable
CREATE TABLE "WorkOrderCard" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "workspaceId" TEXT NOT NULL,
    "contextStats" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptRefinement" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "originalPrompt" TEXT NOT NULL,
    "critique" TEXT NOT NULL,
    "refinedPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptRefinement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelFailure" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "lastFailedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelFailure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderFailure" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "lastFailedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderFailure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardConfig" (
    "cardId" TEXT NOT NULL,

    CONSTRAINT "CardConfig_pkey" PRIMARY KEY ("cardId")
);

-- CreateTable
CREATE TABLE "CustomButton" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actionData" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "CustomButton_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentRole" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "roleId" TEXT,

    CONSTRAINT "ComponentRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Model_providerId_idx" ON "Model"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelCapabilities_modelId_key" ON "ModelCapabilities"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleCategory_name_key" ON "RoleCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_name_key" ON "Tool"("name");

-- CreateIndex
CREATE INDEX "KnowledgeVector_entityType_entityId_idx" ON "KnowledgeVector"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelFailure_providerId_modelId_key" ON "ModelFailure"("providerId", "modelId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderFailure_providerId_key" ON "ProviderFailure"("providerId");

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelCapabilities" ADD CONSTRAINT "ModelCapabilities_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelUsage" ADD CONSTRAINT "ModelUsage_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelUsage" ADD CONSTRAINT "ModelUsage_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RoleCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleTool" ADD CONSTRAINT "RoleTool_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleTool" ADD CONSTRAINT "RoleTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeVector" ADD CONSTRAINT "KnowledgeVector_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderCard" ADD CONSTRAINT "WorkOrderCard_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptRefinement" ADD CONSTRAINT "PromptRefinement_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomButton" ADD CONSTRAINT "CustomButton_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CardConfig"("cardId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentRole" ADD CONSTRAINT "ComponentRole_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CardConfig"("cardId") ON DELETE CASCADE ON UPDATE CASCADE;
