-- Bills: track payer
ALTER TABLE "bills" ADD COLUMN "paid_by_user_id" UUID;
ALTER TABLE "bills" ADD CONSTRAINT "bills_paid_by_user_id_fkey" FOREIGN KEY ("paid_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Bill participants: mark billed
ALTER TABLE "bill_participants" ADD COLUMN "billed_in_id" UUID;
CREATE INDEX "bill_participants_user_id_idx" ON "bill_participants"("user_id");
CREATE INDEX "bill_participants_billed_in_id_idx" ON "bill_participants"("billed_in_id");
ALTER TABLE "bill_participants" ADD CONSTRAINT "bill_participants_billed_in_id_fkey" FOREIGN KEY ("billed_in_id") REFERENCES "billing_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Manual charges (non-zero-sum)
CREATE TABLE "manual_charges" (
    "id" UUID NOT NULL,
    "house_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billed_in_id" UUID,

    CONSTRAINT "manual_charges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "manual_charges_house_id_created_at_idx" ON "manual_charges"("house_id", "created_at");
CREATE INDEX "manual_charges_user_id_created_at_idx" ON "manual_charges"("user_id", "created_at");
CREATE INDEX "manual_charges_billed_in_id_idx" ON "manual_charges"("billed_in_id");

ALTER TABLE "manual_charges" ADD CONSTRAINT "manual_charges_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manual_charges" ADD CONSTRAINT "manual_charges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manual_charges" ADD CONSTRAINT "manual_charges_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manual_charges" ADD CONSTRAINT "manual_charges_billed_in_id_fkey" FOREIGN KEY ("billed_in_id") REFERENCES "billing_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

