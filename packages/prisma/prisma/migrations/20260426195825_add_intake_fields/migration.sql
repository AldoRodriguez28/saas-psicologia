-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "allergies" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "familyMembers" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "hamAScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hamDScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "medications" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "nextAppointment" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "birthPlace" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "guardian" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "guardianRelation" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "insurance" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "insuranceNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "interrogatorio" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "referredBy" TEXT NOT NULL DEFAULT '';
