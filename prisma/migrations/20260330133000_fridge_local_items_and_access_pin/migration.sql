-- Full reset accepted for catalog + purchase history.
DELETE FROM "purchase_undo_tokens";
DELETE FROM "drink_entries";
DELETE FROM "purchases";

DROP TABLE IF EXISTS "fridge_products";
DROP TABLE IF EXISTS "products";
DROP TABLE IF EXISTS "drink_entries";

CREATE TABLE "fridge_items" (
  "id" UUID NOT NULL,
  "fridge_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "fridge_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fridge_items_fridge_id_name_key" ON "fridge_items"("fridge_id", "name");
CREATE INDEX "fridge_items_fridge_id_active_idx" ON "fridge_items"("fridge_id", "active");

ALTER TABLE "fridge_items"
ADD CONSTRAINT "fridge_items_fridge_id_fkey"
FOREIGN KEY ("fridge_id") REFERENCES "fridges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "drink_entries" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "fridge_item_id" UUID NOT NULL,
  "fridge_id" UUID NOT NULL,
  "purchase_id" UUID,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "item_name_at_time" TEXT NOT NULL,
  "price_at_time" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "billed_in_id" UUID,

  CONSTRAINT "drink_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "drink_entries_user_id_created_at_idx" ON "drink_entries"("user_id", "created_at");
CREATE INDEX "drink_entries_fridge_id_created_at_idx" ON "drink_entries"("fridge_id", "created_at");
CREATE INDEX "drink_entries_fridge_item_id_idx" ON "drink_entries"("fridge_item_id");
CREATE INDEX "drink_entries_purchase_id_idx" ON "drink_entries"("purchase_id");
CREATE INDEX "drink_entries_billed_in_id_idx" ON "drink_entries"("billed_in_id");

ALTER TABLE "drink_entries"
ADD CONSTRAINT "drink_entries_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "drink_entries"
ADD CONSTRAINT "drink_entries_fridge_item_id_fkey"
FOREIGN KEY ("fridge_item_id") REFERENCES "fridge_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "drink_entries"
ADD CONSTRAINT "drink_entries_fridge_id_fkey"
FOREIGN KEY ("fridge_id") REFERENCES "fridges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "drink_entries"
ADD CONSTRAINT "drink_entries_purchase_id_fkey"
FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "drink_entries"
ADD CONSTRAINT "drink_entries_billed_in_id_fkey"
FOREIGN KEY ("billed_in_id") REFERENCES "billing_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
