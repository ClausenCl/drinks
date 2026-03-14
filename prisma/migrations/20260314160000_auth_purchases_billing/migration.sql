-- Users: house-scoped names + privileged login + optional resident PIN
ALTER TABLE "users" ADD COLUMN "login_name" TEXT;
ALTER TABLE "users" ADD COLUMN "pin_hash" TEXT;
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- Backfill privileged login names for existing data.
UPDATE "users" SET "login_name" = "name" WHERE "role" <> 'BEWOHNER' AND "login_name" IS NULL;

DROP INDEX "users_name_key";
CREATE UNIQUE INDEX "users_login_name_key" ON "users"("login_name");
CREATE UNIQUE INDEX "users_house_id_name_key" ON "users"("house_id", "name");

-- Purchases: batch logging + undo window
CREATE TABLE "purchases" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "fridge_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_undo_tokens" (
    "token" TEXT NOT NULL,
    "purchase_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_undo_tokens_pkey" PRIMARY KEY ("token")
);

ALTER TABLE "drink_entries" ADD COLUMN "purchase_id" UUID;

CREATE INDEX "drink_entries_purchase_id_idx" ON "drink_entries"("purchase_id");
CREATE INDEX "purchases_user_id_created_at_idx" ON "purchases"("user_id", "created_at");
CREATE INDEX "purchases_fridge_id_created_at_idx" ON "purchases"("fridge_id", "created_at");
CREATE INDEX "purchase_undo_tokens_user_id_expires_at_idx" ON "purchase_undo_tokens"("user_id", "expires_at");

ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_fridge_id_fkey" FOREIGN KEY ("fridge_id") REFERENCES "fridges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_undo_tokens" ADD CONSTRAINT "purchase_undo_tokens_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_undo_tokens" ADD CONSTRAINT "purchase_undo_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "drink_entries" ADD CONSTRAINT "drink_entries_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Billing runs: define "since last bill" for drink entries
CREATE TABLE "billing_runs" (
    "id" UUID NOT NULL,
    "house_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_runs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "drink_entries" ADD COLUMN "billed_in_id" UUID;
CREATE INDEX "drink_entries_billed_in_id_idx" ON "drink_entries"("billed_in_id");
CREATE INDEX "billing_runs_house_id_created_at_idx" ON "billing_runs"("house_id", "created_at");

ALTER TABLE "billing_runs" ADD CONSTRAINT "billing_runs_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_runs" ADD CONSTRAINT "billing_runs_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "drink_entries" ADD CONSTRAINT "drink_entries_billed_in_id_fkey" FOREIGN KEY ("billed_in_id") REFERENCES "billing_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
