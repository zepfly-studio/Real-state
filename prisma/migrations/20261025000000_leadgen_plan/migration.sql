-- AlterTable
ALTER TABLE "LgCampaign" ADD COLUMN     "filtered" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "plan" JSONB;

-- AlterTable
ALTER TABLE "LgLead" ADD COLUMN     "city" TEXT,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "website" TEXT,
ALTER COLUMN "phone" DROP NOT NULL;

