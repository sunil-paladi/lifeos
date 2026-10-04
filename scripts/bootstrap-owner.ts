import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function readBootstrapInput() {
  const [emailArgument, gymNameArgument, ...extraArguments] =
    process.argv.slice(2);

  if (extraArguments.length > 0) {
    throw new Error("Usage: npm run bootstrap:owner [email] [gym name]");
  }

  const readline = createInterface({ input: stdin, output: stdout });

  try {
    const email = (
      emailArgument ??
      (await readline.question("Existing user's email: "))
    )
      .trim()
      .toLowerCase();
    const gymName = (
      gymNameArgument ??
      (await readline.question("First gym name: "))
    ).trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }

    if (!gymName || gymName.length > 120) {
      throw new Error("Gym name must contain 1 to 120 characters.");
    }

    return { email, gymName };
  } finally {
    readline.close();
  }
}

async function bootstrapOwner(email: string, gymName: string) {
  return prisma.$transaction(
    async (tx) => {
      const existingOwner = await tx.user.findFirst({
        where: { role: "OWNER" },
        select: { id: true },
      });
      const existingOwnerMembership = await tx.gymMembership.findFirst({
        where: { role: "OWNER" },
        select: { id: true },
      });
      const existingGym = await tx.gym.findFirst({
        select: { id: true },
      });

      if (existingOwner || existingOwnerMembership || existingGym) {
        throw new Error(
          "Bootstrap refused: an Owner, Owner membership, or gym already exists."
        );
      }

      const user = await tx.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!user) {
        throw new Error("No existing user was found for that email.");
      }

      if (user.role !== "USER") {
        throw new Error("The selected account is not a normal User account.");
      }

      await tx.user.update({
        where: { id: user.id },
        data: { role: "OWNER" },
      });

      const gym = await tx.gym.create({
        data: {
          name: gymName,
          ownerId: user.id,
        },
        select: { id: true, name: true },
      });

      await tx.gymMembership.create({
        data: {
          gymId: gym.id,
          userId: user.id,
          role: "OWNER",
          status: "ACTIVE",
        },
      });

      return gym;
    },
    { isolationLevel: "Serializable" }
  );
}

async function main() {
  const { email, gymName } = await readBootstrapInput();
  const gym = await bootstrapOwner(email, gymName);

  console.log(
    `First Owner bootstrap completed for ${email}. Gym "${gym.name}" was created.`
  );
  console.log("Verify that the new Owner can sign in and access the gym.");
}

main()
  .catch((error: unknown) => {
    console.error(
      "Owner bootstrap failed:",
      error instanceof Error ? error.message : "An unexpected error occurred."
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
