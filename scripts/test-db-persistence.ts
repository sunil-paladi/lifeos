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
  console.log("🔄 Testing LifeOS database persistence...\n");

  const testEmail = `persistence_${Date.now()}@lifeos.test`;
  const testUsername = `persistence_test_${Date.now()}`;

  // CREATE
  const user = await prisma.user.create({
    data: {
      name: "LifeOS Persistence Test",
      username: testUsername,
      email: testEmail,
    },
  });

  console.log("✅ CREATE successful:", user.id);

  // READ
  const foundUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
  });

  if (!foundUser) {
    throw new Error("❌ User could not be read from database");
  }

  console.log("✅ READ successful:", foundUser.name);

  // DELETE
  await prisma.user.delete({
    where: {
      id: user.id,
    },
  });

  console.log("✅ DELETE successful");

  console.log("\n🎉 Database persistence test PASSED!");
}

main()
  .catch((error) => {
    console.error("\n❌ Database persistence test failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });