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
  console.log("👤 Testing LifeOS user account...\n");

  const timestamp = Date.now();

  // 1. User WITHOUT phone number
  const userWithoutPhone = await prisma.user.create({
    data: {
      name: "LifeOS Optional Phone Test",
      username: `optional_phone_${timestamp}`,
    },
  });

  console.log(
    "✅ User without phone created:",
    userWithoutPhone.username
  );

  // 2. User WITH phone number
  const userWithPhone = await prisma.user.create({
    data: {
      name: "LifeOS Phone Test",
      username: `phone_test_${timestamp}`,
      phoneNumber: `99999${String(timestamp).slice(-5)}`,
    },
  });

  console.log(
    "✅ User with phone created:",
    userWithPhone.username
  );

  // 3. Verify both users can be read
  const foundWithoutPhone = await prisma.user.findUnique({
    where: {
      id: userWithoutPhone.id,
    },
  });

  const foundWithPhone = await prisma.user.findUnique({
    where: {
      id: userWithPhone.id,
    },
  });

  if (!foundWithoutPhone) {
    throw new Error("❌ User without phone could not be read");
  }

  if (!foundWithPhone) {
    throw new Error("❌ User with phone could not be read");
  }

  console.log("✅ Both users read successfully");

  // 4. Clean up test users
  await prisma.user.delete({
    where: {
      id: userWithoutPhone.id,
    },
  });

  await prisma.user.delete({
    where: {
      id: userWithPhone.id,
    },
  });

  console.log("✅ Test users deleted");

  console.log("\n🎉 USER ACCOUNT TEST PASSED!");
}

main()
  .catch((error) => {
    console.error("\n❌ User account test failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });