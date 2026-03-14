CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "minister_profiles" (
    "user_id" UUID NOT NULL,
    "house_id" UUID NOT NULL,

    CONSTRAINT "minister_profiles_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "minister_fridge_permissions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "fridge_id" UUID NOT NULL,

    CONSTRAINT "minister_fridge_permissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "minister_profiles_house_id_idx" ON "minister_profiles"("house_id");
CREATE UNIQUE INDEX "minister_fridge_permissions_user_id_fridge_id_key" ON "minister_fridge_permissions"("user_id", "fridge_id");
CREATE INDEX "minister_fridge_permissions_fridge_id_idx" ON "minister_fridge_permissions"("fridge_id");

ALTER TABLE "minister_profiles" ADD CONSTRAINT "minister_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "minister_profiles" ADD CONSTRAINT "minister_profiles_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "minister_fridge_permissions" ADD CONSTRAINT "minister_fridge_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "minister_fridge_permissions" ADD CONSTRAINT "minister_fridge_permissions_fridge_id_fkey" FOREIGN KEY ("fridge_id") REFERENCES "fridges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: create profiles for existing ministers and grant access to all current fridges by default.
INSERT INTO "minister_profiles" ("user_id", "house_id")
SELECT u.id, u.house_id
FROM "users" u
WHERE u.role = 'GETRAENKEMINISTER'
ON CONFLICT ("user_id") DO NOTHING;

INSERT INTO "minister_fridge_permissions" ("id", "user_id", "fridge_id")
SELECT gen_random_uuid(), u.id, f.id
FROM "users" u
CROSS JOIN "fridges" f
WHERE u.role = 'GETRAENKEMINISTER'
ON CONFLICT ("user_id", "fridge_id") DO NOTHING;
