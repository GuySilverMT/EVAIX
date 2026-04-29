/*
  Warnings:

  - You are about to drop the `ProviderFailure` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[providerId,name]` on the table `Model` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Role` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Model_providerId_idx";

-- DropTable
DROP TABLE "ProviderFailure";

-- CreateIndex
CREATE UNIQUE INDEX "Model_providerId_name_key" ON "Model"("providerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
