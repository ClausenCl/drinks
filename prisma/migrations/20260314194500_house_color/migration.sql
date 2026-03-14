-- Add house color (used for theming).
ALTER TABLE "houses" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#111827';

-- Default colors for A-E (case-insensitive).
UPDATE "houses" SET "color" = '#2563eb' WHERE "name" ILIKE 'a%';
UPDATE "houses" SET "color" = '#16a34a' WHERE "name" ILIKE 'b%';
UPDATE "houses" SET "color" = '#f97316' WHERE "name" ILIKE 'c%';
UPDATE "houses" SET "color" = '#7c3aed' WHERE "name" ILIKE 'd%';
UPDATE "houses" SET "color" = '#dc2626' WHERE "name" ILIKE 'e%';

