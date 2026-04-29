/*
  Warnings:

  - You are about to drop the `ModelCapabilities` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ComponentRole" DROP CONSTRAINT "ComponentRole_cardId_fkey";

-- DropForeignKey
ALTER TABLE "CustomButton" DROP CONSTRAINT "CustomButton_cardId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_roleId_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeVector" DROP CONSTRAINT "KnowledgeVector_modelId_fkey";

-- DropForeignKey
ALTER TABLE "Model" DROP CONSTRAINT "Model_providerId_fkey";

-- DropForeignKey
ALTER TABLE "ModelCapabilities" DROP CONSTRAINT "ModelCapabilities_modelId_fkey";

-- DropForeignKey
ALTER TABLE "ModelUsage" DROP CONSTRAINT "ModelUsage_modelId_fkey";

-- DropForeignKey
ALTER TABLE "ModelUsage" DROP CONSTRAINT "ModelUsage_roleId_fkey";

-- DropForeignKey
ALTER TABLE "PromptRefinement" DROP CONSTRAINT "PromptRefinement_roleId_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "RoleTool" DROP CONSTRAINT "RoleTool_roleId_fkey";

-- DropForeignKey
ALTER TABLE "RoleTool" DROP CONSTRAINT "RoleTool_toolId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderCard" DROP CONSTRAINT "WorkOrderCard_workspaceId_fkey";

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "metadata" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "serverId" TEXT;

-- DropTable
DROP TABLE "ModelCapabilities";

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

-- CreateTable
CREATE TABLE "RoleVariant" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "identityConfig" JSONB NOT NULL DEFAULT '{}',
    "cortexConfig" JSONB NOT NULL DEFAULT '{}',
    "contextConfig" JSONB NOT NULL DEFAULT '{}',
    "governanceConfig" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

    CONSTRAINT "modelcapabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_embedding" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "dimensions" INTEGER,
    "maxContext" INTEGER,

    CONSTRAINT "model_embedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_audio" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "voices" JSONB DEFAULT '[]',
    "sampleRates" JSONB DEFAULT '[]',

    CONSTRAINT "model_audio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_image" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "resolutions" JSONB DEFAULT '[]',
    "styles" JSONB DEFAULT '[]',

    CONSTRAINT "model_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_safety" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "categories" JSONB DEFAULT '[]',

    CONSTRAINT "model_safety_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_unknown" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "reason" TEXT DEFAULT 'uncategorized',

    CONSTRAINT "model_unknown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_models_example" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "displayName" TEXT,
    "description" TEXT,
    "inputTokenLimit" INTEGER,
    "outputTokenLimit" INTEGER,
    "supportedGenerationMethods" JSONB,
    "temperature" INTEGER,
    "topP" DOUBLE PRECISION,
    "topK" INTEGER,
    "maxTemperature" INTEGER,

    CONSTRAINT "google_models_example_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "modelcapabilities_modelId_key" ON "modelcapabilities"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "model_embedding_modelId_key" ON "model_embedding"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "model_audio_modelId_key" ON "model_audio"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "model_image_modelId_key" ON "model_image"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "model_safety_modelId_key" ON "model_safety"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "model_unknown_modelId_key" ON "model_unknown"("modelId");
