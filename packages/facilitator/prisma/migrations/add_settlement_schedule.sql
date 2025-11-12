-- Add error tracking to Settlement
ALTER TABLE "Settlement" ADD COLUMN "errorMessage" TEXT;

-- Create SettlementSchedule table
CREATE TABLE "SettlementSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "merchantWallet" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "minimumAmount" TEXT NOT NULL DEFAULT '100',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastExecutedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Add indexes
CREATE INDEX "SettlementSchedule_serviceId_idx" ON "SettlementSchedule"("serviceId");
CREATE INDEX "SettlementSchedule_merchantWallet_idx" ON "SettlementSchedule"("merchantWallet");
CREATE INDEX "SettlementSchedule_enabled_idx" ON "SettlementSchedule"("enabled");
CREATE UNIQUE INDEX "SettlementSchedule_serviceId_merchantWallet_key" ON "SettlementSchedule"("serviceId", "merchantWallet");

-- Add webhook fields to Service table if they don't exist
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "webhookUrl" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "webhookSecret" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "merchantWallet" TEXT;

-- Create index on merchantWallet
CREATE INDEX IF NOT EXISTS "Service_merchantWallet_idx" ON "Service"("merchantWallet");
