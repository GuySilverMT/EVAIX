-- CreateEnum
CREATE TYPE "BillingRiskLevel" AS ENUM ('ZERO_RISK', 'PROMO_BURN', 'CC_ON_FILE');

-- CreateEnum
CREATE TYPE "ProviderClass" AS ENUM ('FOUNDATIONAL', 'AGGREGATOR', 'INFERENCE_ENGINE', 'LOCAL');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('CODE', 'WRITE', 'RESEARCH', 'DEPLOY');

-- CreateTable
CREATE TABLE "ProviderConfig" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "apiKey" TEXT,
    "apiKeyEnvVar" TEXT,
    "baseUrl" TEXT,
    "billingDashboardUrl" TEXT,
    "billingRiskLevel" "BillingRiskLevel" NOT NULL DEFAULT 'ZERO_RISK',
    "currentScrapedSpend" DOUBLE PRECISION,
    "enforceFreeOnly" BOOLEAN NOT NULL DEFAULT true,
    "isCreditCardLinked" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT,
    "lastScrapeTime" TIMESTAMP(3),
    "monthlyBudget" DOUBLE PRECISION,
    "name" TEXT NOT NULL,
    "pricingUrl" TEXT,
    "promoMonthlyLimit" DOUBLE PRECISION,
    "providerClass" "ProviderClass" NOT NULL DEFAULT 'FOUNDATIONAL',
    "serviceCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sessionValid" BOOLEAN DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderModel" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "apiString" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "contextWindowOverride" INTEGER,
    "inputCostPer1kOverride" DOUBLE PRECISION,
    "outputCostPer1kOverride" DOUBLE PRECISION,
    "isFreeTier" BOOLEAN NOT NULL DEFAULT false,
    "capabilityOverrides" JSONB DEFAULT '{}',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rootPath" TEXT NOT NULL,
    "projectType" "ProjectType" NOT NULL DEFAULT 'CODE',
    "defaultModelId" TEXT,
    "targetPlatform" TEXT,
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
    "isCalibrated" BOOLEAN NOT NULL DEFAULT false,
    "trialsCode" INTEGER NOT NULL DEFAULT 0,
    "shadowScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "underlyingProvider" TEXT,
    "scoreJson" INTEGER NOT NULL DEFAULT 0,
    "scoreCode" INTEGER NOT NULL DEFAULT 0,
    "scorePlan" INTEGER NOT NULL DEFAULT 0,
    "scoreTool" INTEGER NOT NULL DEFAULT 0,
    "trialsJson" INTEGER NOT NULL DEFAULT 0,
    "trialsPlan" INTEGER NOT NULL DEFAULT 0,
    "trialsTool" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleVariant" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "identityConfig" JSONB NOT NULL DEFAULT '{}',
    "cortexConfig" JSONB NOT NULL DEFAULT '{}',
    "contextConfig" JSONB NOT NULL DEFAULT '{}',
    "governanceConfig" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "voiceSettings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "behaviorConfig" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "RoleVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssessment" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelcapabilities" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelId" TEXT,
    "modelName" TEXT,
    "contextWindow" INTEGER,
    "maxOutput" INTEGER,
    "hasVision" BOOLEAN,
    "hasAudioInput" BOOLEAN,
    "hasAudioOutput" BOOLEAN,
    "isMultimodal" BOOLEAN,
    "supportsFunctionCalling" BOOLEAN,
    "supportsJsonMode" BOOLEAN,
    "tokenizer" TEXT,
    "paramCount" TEXT,
    "requestsPerMinute" TEXT,
    "tokensPerMinute" TEXT,
    "hasImageGen" BOOLEAN,
    "hasTTS" BOOLEAN,
    "hasReasoning" BOOLEAN,
    "hasEmbedding" BOOLEAN,
    "hasOCR" BOOLEAN,
    "hasReward" BOOLEAN,
    "hasModeration" BOOLEAN,
    "confidence" TEXT,
    "source" TEXT,
    "specs" JSONB DEFAULT '{}',
    "primaryTask" TEXT,
    "isLocal" BOOLEAN DEFAULT false,
    "failureCount" INTEGER DEFAULT 0,
    "latencyAvg" DOUBLE PRECISION DEFAULT 0,
    "modalityTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "successCount" INTEGER DEFAULT 0,
    "successRate" DOUBLE PRECISION DEFAULT 0,
    "utilityScore" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "modelcapabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatModel" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "contextWindow" INTEGER,
    "supportsTools" BOOLEAN NOT NULL DEFAULT true,
    "supportsJson" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChatModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmbeddingModel" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "dimensions" INTEGER,
    "maxContext" INTEGER,

    CONSTRAINT "EmbeddingModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisionModel" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "maxResolution" TEXT,
    "supportsVideo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VisionModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioModel" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "voices" JSONB DEFAULT '[]',
    "sampleRates" JSONB DEFAULT '[]',

    CONSTRAINT "AudioModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageModel" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "resolutions" JSONB DEFAULT '[]',
    "styles" JSONB DEFAULT '[]',

    CONSTRAINT "ImageModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceModel" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "categories" JSONB DEFAULT '[]',

    CONSTRAINT "ComplianceModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardModel" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "scoreType" TEXT,

    CONSTRAINT "RewardModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnknownModel" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "reason" TEXT DEFAULT 'uncategorized',

    CONSTRAINT "UnknownModel_pkey" PRIMARY KEY ("id")
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
    "providerId" TEXT,
    "underlyingProvider" TEXT,

    CONSTRAINT "ModelUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrompt" TEXT NOT NULL,
    "categoryId" TEXT,
    "targetProvider" TEXT,
    "targetModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "icon" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "serverId" TEXT,

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
CREATE TABLE "VectorEmbedding" (
    "id" TEXT NOT NULL,
    "vector" DOUBLE PRECISION[],
    "content" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VectorEmbedding_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "VoiceEngine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceEngine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orchestration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT,
    "cells" JSONB NOT NULL,
    "gridSize" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Orchestration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookmarkFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookmarkFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "faviconUrl" TEXT,
    "folderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "args" TEXT[],
    "env" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_registry" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider_id" TEXT,
    "model_id" TEXT,
    "model_name" TEXT,
    "provider_data" JSONB,
    "ai_data" JSONB,
    "specs" JSONB,
    "is_free" BOOLEAN,
    "cost_per_1k" TEXT,
    "updated_at" TEXT,
    "capability_tags" JSONB,
    "first_seen_at" TEXT,
    "is_active" BOOLEAN,
    "last_seen_at" TEXT,
    "source" TEXT,

    CONSTRAINT "model_registry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderModel_providerId_idx" ON "ProviderModel"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderModel_providerId_apiString_key" ON "ProviderModel"("providerId", "apiString");

-- CreateIndex
CREATE UNIQUE INDEX "Model_providerId_name_key" ON "Model"("providerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "modelcapabilities_modelId_key" ON "modelcapabilities"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatModel_modelId_key" ON "ChatModel"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "EmbeddingModel_modelId_key" ON "EmbeddingModel"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "VisionModel_modelId_key" ON "VisionModel"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "AudioModel_modelId_key" ON "AudioModel"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "ImageModel_modelId_key" ON "ImageModel"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceModel_modelId_key" ON "ComplianceModel"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardModel_modelId_key" ON "RewardModel"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "UnknownModel_modelId_key" ON "UnknownModel"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RoleCategory_name_key" ON "RoleCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_name_key" ON "Tool"("name");

-- CreateIndex
CREATE INDEX "KnowledgeVector_entityType_entityId_idx" ON "KnowledgeVector"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "VectorEmbedding_filePath_idx" ON "VectorEmbedding"("filePath");

-- CreateIndex
CREATE INDEX "VectorEmbedding_workspaceId_idx" ON "VectorEmbedding"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelFailure_providerId_modelId_key" ON "ModelFailure"("providerId", "modelId");

-- CreateIndex
CREATE UNIQUE INDEX "McpServer_name_key" ON "McpServer"("name");
