import { PrismaClient, UserRole, LogType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const houses = await Promise.all(
    ["House A", "House B", "House C", "House D", "House E"].map((name) =>
      prisma.house.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  const [houseA, houseB] = houses;

  const adminPasswordHash = await bcrypt.hash("admin", 12);
  const managerPasswordHash = await bcrypt.hash("manager", 12);
  const residentPasswordHash = await bcrypt.hash("resident", 12);
  const residentPinHash = await bcrypt.hash("1234", 12);

  const admin = await prisma.user.upsert({
    where: { houseId_name: { houseId: houseA.id, name: "admin" } },
    update: {},
    create: {
      name: "admin",
      loginName: "admin",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      houseId: houseA.id,
      active: true,
    },
  });

  await prisma.user.upsert({
    where: { houseId_name: { houseId: houseA.id, name: "manager" } },
    update: {},
    create: {
      name: "manager",
      loginName: "manager",
      passwordHash: managerPasswordHash,
      role: UserRole.GETRAENKEMINISTER,
      houseId: houseA.id,
      active: true,
    },
  });

  await prisma.user.upsert({
    where: { houseId_name: { houseId: houseB.id, name: "resident" } },
    update: {},
    create: {
      name: "resident",
      passwordHash: residentPasswordHash,
      pinHash: residentPinHash,
      requirePinOnPurchase: false,
      role: UserRole.BEWOHNER,
      houseId: houseB.id,
      active: true,
    },
  });

  const beer = await prisma.product.upsert({
    where: { name: "Bier" },
    update: { price: "1.50" },
    create: { name: "Bier", price: "1.50", active: true },
  });

  const cola = await prisma.product.upsert({
    where: { name: "Cola" },
    update: { price: "1.00" },
    create: { name: "Cola", price: "1.00", active: true },
  });

  const fridge = await prisma.fridge.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: { name: "Kueche" },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Kueche",
      locationDescription: "Erdgeschoss, neben dem Herd",
      active: true,
    },
  });

  await prisma.fridgeProduct.upsert({
    where: { fridgeId_productId: { fridgeId: fridge.id, productId: beer.id } },
    update: {},
    create: { fridgeId: fridge.id, productId: beer.id },
  });

  await prisma.fridgeProduct.upsert({
    where: { fridgeId_productId: { fridgeId: fridge.id, productId: cola.id } },
    update: {},
    create: { fridgeId: fridge.id, productId: cola.id },
  });

  // Create a single initial log entry (idempotent enough for repeated seeding).
  const anyPriceChangeLog = await prisma.log.findFirst({ where: { type: LogType.PRICE_CHANGED } });
  if (!anyPriceChangeLog) {
    await prisma.log.create({
      data: {
        type: LogType.PRICE_CHANGED,
        userId: admin.id,
        metadata: { seeded: true },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
