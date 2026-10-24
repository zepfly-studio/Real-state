-- CreateTable
CREATE TABLE "LgCampaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetLocation" TEXT,
    "leadTarget" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transcript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LgCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LgLead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCRAPED',
    "askingPrice" DECIMAL(14,2),
    "timeline" TEXT,
    "crmLeadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LgLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LgMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT,
    "phone" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LgMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LgEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT,
    "leadId" TEXT,
    "type" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LgEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LgCampaign_tenantId_createdAt_idx" ON "LgCampaign"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "LgLead_tenantId_status_idx" ON "LgLead"("tenantId", "status");

-- CreateIndex
CREATE INDEX "LgLead_tenantId_campaignId_idx" ON "LgLead"("tenantId", "campaignId");

-- CreateIndex
CREATE INDEX "LgLead_tenantId_phone_idx" ON "LgLead"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "LgMessage_tenantId_phone_idx" ON "LgMessage"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "LgMessage_tenantId_createdAt_idx" ON "LgMessage"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "LgEvent_tenantId_createdAt_idx" ON "LgEvent"("tenantId", "createdAt");

