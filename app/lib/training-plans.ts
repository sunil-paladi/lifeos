import { NextResponse } from "next/server";
import { requireGymRole } from "@/app/lib/authorization";
import { prisma } from "@/lib/prisma";

const PLAN_GYM_ROLES = ["OWNER", "TRAINER", "MEMBER"] as const;

export async function getOwnedTrainingPlan(
  planId: string,
  userId: string
) {
  const plan = await prisma.trainingPlan.findFirst({
    where: {
      id: planId,
      userId,
    },
  });

  if (!plan) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Training plan not found" },
        { status: 404 }
      ),
    };
  }

  const access = await requireGymRole(
    plan.gymId,
    PLAN_GYM_ROLES
  );

  if (!access.ok) {
    return access;
  }

  return {
    ok: true as const,
    user: access.user,
    plan,
  };
}