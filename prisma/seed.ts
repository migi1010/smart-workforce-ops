import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.INIT_ADMIN_USERNAME || "admin";
  const password = process.env.INIT_ADMIN_PASSWORD || "admin123456";

  console.log(`🌱 Seeding database...`);

  // 1. Seed Admin
  const existingAdmin = await prisma.user.findUnique({
    where: { username },
  });

  if (existingAdmin) {
    console.log(`⚠️ Admin user "${username}" already exists. Skipping creation.`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await prisma.user.create({
      data: {
        username,
        passwordHash,
        name: "系統管理員",
      },
    });
    console.log(`✅ Admin user "${username}" created successfully.`);
  }

  // 2. Seed default Workplace
  const existingWorkplace = await prisma.workplace.findFirst();
  if (existingWorkplace) {
    console.log(`⚠️ Workplace "${existingWorkplace.name}" already exists. Skipping creation.`);
  } else {
    const token = crypto.randomUUID();
    const workplace = await prisma.workplace.create({
      data: {
        name: "三峽八方雲集國際店",
        address: "新北市三峽區國際一街",
        latitude: 24.9376,
        longitude: 121.3688,
        allowedRadiusMeters: 100,
        warningRadiusMeters: 300,
        workplaceToken: token,
      },
    });
    console.log(`✅ Default workplace "${workplace.name}" created successfully.`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
