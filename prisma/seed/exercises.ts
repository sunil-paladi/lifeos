import "dotenv/config";

import { PrismaClient } from "../../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { exercises } from "../../app/data/exercises";

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
  const allExercises = Object.values(exercises).flat();

  console.log(`Found ${allExercises.length} exercises to seed.`);

  for (const exercise of allExercises) {
    await prisma.exercise.upsert({
      where: {
        id: String(exercise.id),
      },
      update: {
        name: exercise.name,
        imageUrl: exercise.image,
        primaryMuscle: exercise.primaryMuscle,
        secondaryMuscles: exercise.secondaryMuscles.join(", "),
        equipment: exercise.equipment,
        instructions: exercise.instructions.join("\n"),
        visibility: "GLOBAL",
      },
      create: {
        id: String(exercise.id),
        name: exercise.name,
        imageUrl: exercise.image,
        primaryMuscle: exercise.primaryMuscle,
        secondaryMuscles: exercise.secondaryMuscles.join(", "),
        equipment: exercise.equipment,
        instructions: exercise.instructions.join("\n"),
        visibility: "GLOBAL",
      },
    });
  }

  console.log("✅ Exercise seed completed.");
}

main()
  .catch((error) => {
    console.error("❌ Exercise seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
