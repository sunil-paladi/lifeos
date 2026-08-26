import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🔌 Testing LifeOS database connection...\n");

  const testEmail = `db-test-${Date.now()}@lifeos.local`;
  const testUsername = `db_test_${Date.now()}`;

  // 1. CREATE
  const user = await prisma.user.create({
    data: {
      name: "LifeOS DB Test User",
      username: testUsername,
      email: testEmail,
    },
  });

  console.log("☑ CREATE successful:", user.id);

  // 2. READ
  const foundUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
  });

  if (!foundUser) {
    throw new Error("❌ Could not read the test user");
  }

  console.log("☑ READ successful:", foundUser.name);

  // 3. DELETE
  await prisma.user.delete({
    where: {
      id: user.id,
    },
  });

  console.log("☑ DELETE successful");

  console.log("\n🎉 Database read/write test PASSED!");
}

main()
  .catch((error) => {
    console.error("\n❌ Database test failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });