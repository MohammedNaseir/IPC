-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "DocumentCenterFile" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionEventId" TEXT;

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionEventId" TEXT;

-- AlterTable
ALTER TABLE "Hospital" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionEventId" TEXT;

-- AlterTable
ALTER TABLE "OrgDocument" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionEventId" TEXT;

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionEventId" TEXT;

-- AlterTable
ALTER TABLE "Practitioner" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionEventId" TEXT;

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionEventId" TEXT;

-- AlterTable
ALTER TABLE "ProgramFile" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionEventId" TEXT;

-- AlterTable
ALTER TABLE "ProgramFolder" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionEventId" TEXT;

-- AlterTable
ALTER TABLE "Training" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionEventId" TEXT;

-- AlterTable
ALTER TABLE "TrainingTemplate" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionEventId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionEventId" TEXT;

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionEventId" TEXT;

-- CreateIndex
CREATE INDEX "DocumentCenterFile_deletedAt_idx" ON "DocumentCenterFile"("deletedAt");

-- CreateIndex
CREATE INDEX "Equipment_deletedAt_idx" ON "Equipment"("deletedAt");

-- CreateIndex
CREATE INDEX "Hospital_deletedAt_idx" ON "Hospital"("deletedAt");

-- CreateIndex
CREATE INDEX "OrgDocument_deletedAt_idx" ON "OrgDocument"("deletedAt");

-- CreateIndex
CREATE INDEX "Policy_deletedAt_idx" ON "Policy"("deletedAt");

-- CreateIndex
CREATE INDEX "Practitioner_deletedAt_idx" ON "Practitioner"("deletedAt");

-- CreateIndex
CREATE INDEX "Program_deletedAt_idx" ON "Program"("deletedAt");

-- CreateIndex
CREATE INDEX "ProgramFile_deletedAt_idx" ON "ProgramFile"("deletedAt");

-- CreateIndex
CREATE INDEX "ProgramFolder_deletedAt_idx" ON "ProgramFolder"("deletedAt");

-- CreateIndex
CREATE INDEX "Training_deletedAt_idx" ON "Training"("deletedAt");

-- CreateIndex
CREATE INDEX "TrainingTemplate_deletedAt_idx" ON "TrainingTemplate"("deletedAt");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "Visit_deletedAt_idx" ON "Visit"("deletedAt");

-- CreateIndex (partial unique index, not expressible in schema.prisma's declarative syntax:
-- unique among ACTIVE rows only, so a soft-deleted coordinator's email is immediately reusable
-- by a new account -- see specs/005-soft-delete/research.md R-005)
CREATE UNIQUE INDEX "User_email_active_key" ON "User"("email") WHERE "deletedAt" IS NULL;
