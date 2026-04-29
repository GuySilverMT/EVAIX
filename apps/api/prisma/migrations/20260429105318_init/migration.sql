/*
  Warnings:

  - You are about to drop the column `baseURL` on the `ProviderConfig` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `ProviderConfig` table. All the data in the column will be lost.
  - You are about to drop the `model_audio` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `model_embedding` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `model_image` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `model_safety` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `model_unknown` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `name` to the `ProviderConfig` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BillingRiskLevel" AS ENUM ('ZERO_RISK', 'PROMO_BURN', 'CC_ON_FILE');

-- CreateEnum
CREATE TYPE "ProviderClass" AS ENUM ('FOUNDATIONAL', 'AGGREGATOR', 'INFERENCE_ENGINE', 'LOCAL');

-- AlterTable
ALTER TABLE "Model" ADD COLUMN     "underlyingProvider" TEXT;

-- AlterTable
ALTER TABLE "ModelUsage" ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "underlyingProvider" TEXT;

-- AlterTable
ALTER TABLE "ProviderConfig" DROP COLUMN "baseURL",
DROP COLUMN "label",
ADD COLUMN     "apiKey" TEXT,
ADD COLUMN     "apiKeyEnvVar" TEXT,
ADD COLUMN     "baseUrl" TEXT,
ADD COLUMN     "billingDashboardUrl" TEXT,
ADD COLUMN     "billingRiskLevel" "BillingRiskLevel" NOT NULL DEFAULT 'ZERO_RISK',
ADD COLUMN     "currentScrapedSpend" DOUBLE PRECISION,
ADD COLUMN     "enforceFreeOnly" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isCreditCardLinked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lastScrapeTime" TIMESTAMP(3),
ADD COLUMN     "monthlyBudget" DOUBLE PRECISION,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "pricingUrl" TEXT,
ADD COLUMN     "promoMonthlyLimit" DOUBLE PRECISION,
ADD COLUMN     "providerClass" "ProviderClass" NOT NULL DEFAULT 'FOUNDATIONAL',
ADD COLUMN     "serviceCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sessionValid" BOOLEAN DEFAULT false,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "RoleCategory" ADD COLUMN     "color" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "RoleVariant" ADD COLUMN     "behaviorConfig" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "modelcapabilities" ADD COLUMN     "failureCount" INTEGER DEFAULT 0,
ADD COLUMN     "latencyAvg" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "modalityTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "successCount" INTEGER DEFAULT 0,
ADD COLUMN     "successRate" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "utilityScore" DOUBLE PRECISION DEFAULT 0;

-- DropTable
DROP TABLE "model_audio";

-- DropTable
DROP TABLE "model_embedding";

-- DropTable
DROP TABLE "model_image";

-- DropTable
DROP TABLE "model_safety";

-- DropTable
DROP TABLE "model_unknown";

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
CREATE TABLE "VectorEmbedding" (
    "id" TEXT NOT NULL,
    "vector" DOUBLE PRECISION[],
    "content" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VectorEmbedding_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "VoiceRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "contextModifiers" JSONB,
    "responseStyle" JSONB,
    "voiceSettings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceRole_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "VectorEmbedding_filePath_idx" ON "VectorEmbedding"("filePath");
