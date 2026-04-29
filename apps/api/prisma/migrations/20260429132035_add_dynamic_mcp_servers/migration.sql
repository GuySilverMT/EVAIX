ALTER TABLE "McpServer" DROP COLUMN "isEnabled"; ALTER TABLE "McpServer" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
