import { prisma } from "@/lib/prisma";

export async function getPTSessionMembership(userId: string, gymId: string) {
  return prisma.gymMembership.findFirst({
    where: {
      gymId,
      userId,
      role: { in: ["OWNER", "TRAINER"] },
      status: "ACTIVE",
    },
    select: {
      id: true,
      gymId: true,
      role: true,
    },
  });
}

export function isValidSessionDuration(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 480;
}

export function parseScheduledAt(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}