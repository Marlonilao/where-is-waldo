-- AlterTable
ALTER TABLE "Character" ADD COLUMN "imageUrl" TEXT;

-- Backfill the seeded Characters, whose headshots are named after them.
UPDATE "Character" SET "imageUrl" = '/images/' || lower("name") || '.webp';

ALTER TABLE "Character" ALTER COLUMN "imageUrl" SET NOT NULL;
