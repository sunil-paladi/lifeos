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

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("👤 Testing LifeOS username...\n");

  const username = `lifeos_test_${Date.now()}`;

  // 1. Create user with username
  const user = await prisma.user.create({
    data: {
      name: "LifeOS Username Test",
      username,
    },
  });

  console.log("✅ User created:", user.username);

  // 2. Find user by username
  const foundUser = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (!foundUser) {
    throw new Error("❌ Could not find user by username");
  }

  console.log("✅ User found by username:", foundUser.name);

  // 3. Verify duplicate username protection
  try {
    await prisma.user.create({
      data: {
        name: "LifeOS Duplicate Username Test",
        username,
      },
    });

    throw new Error(
      "❌ Duplicate username was unexpectedly allowed"
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Duplicate username was unexpectedly allowed")
    ) {
      throw error;
    }

    console.log("✅ Duplicate username correctly rejected");
  }

  // 4. Clean up
  await prisma.user.delete({
    where: {
      id: user.id,
    },
  });

  console.log("✅ Test user deleted");
  console.log("\n🎉 USERNAME TEST PASSED!");
}

main()
  .catch((error) => {
    console.error("\n❌ Username test failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });