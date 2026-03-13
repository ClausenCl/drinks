-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('BEWOHNER', 'GETRAENKEMINISTER', 'ADMIN');

-- CreateEnum
CREATE TYPE "log_type" AS ENUM ('DRINK_ADDED', 'DRINK_DELETED', 'USER_DELETED', 'PRICE_CHANGED');

-- CreateTable
CREATE TABLE "houses" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "houses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'BEWOHNER',
    "house_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fridges" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "location_description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fridges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fridge_products" (
    "id" UUID NOT NULL,
    "fridge_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,

    CONSTRAINT "fridge_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drink_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "fridge_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price_at_time" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "drink_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_participants" (
    "id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "share_amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "bill_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" UUID NOT NULL,
    "type" "log_type" NOT NULL,
    "user_id" UUID NOT NULL,
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "houses_name_key" ON "houses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_name_key" ON "users"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_name_key" ON "products"("name");

-- CreateIndex
CREATE UNIQUE INDEX "fridge_products_fridge_id_product_id_key" ON "fridge_products"("fridge_id", "product_id");

-- CreateIndex
CREATE INDEX "drink_entries_user_id_created_at_idx" ON "drink_entries"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "drink_entries_fridge_id_created_at_idx" ON "drink_entries"("fridge_id", "created_at");

-- CreateIndex
CREATE INDEX "bills_created_by_user_id_created_at_idx" ON "bills"("created_by_user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bill_participants_bill_id_user_id_key" ON "bill_participants"("bill_id", "user_id");

-- CreateIndex
CREATE INDEX "logs_type_created_at_idx" ON "logs"("type", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fridge_products" ADD CONSTRAINT "fridge_products_fridge_id_fkey" FOREIGN KEY ("fridge_id") REFERENCES "fridges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fridge_products" ADD CONSTRAINT "fridge_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_entries" ADD CONSTRAINT "drink_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_entries" ADD CONSTRAINT "drink_entries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_entries" ADD CONSTRAINT "drink_entries_fridge_id_fkey" FOREIGN KEY ("fridge_id") REFERENCES "fridges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_participants" ADD CONSTRAINT "bill_participants_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_participants" ADD CONSTRAINT "bill_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
