import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ========================================
// GET ONE TRAINING PLAN
// ========================================

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { planId } = await params;

  const plan = await prisma.trainingPlan.findFirst({
    where: {
      id: planId,
      userId: session.user.id,
    },
  });

  if (!plan) {
    return NextResponse.json(
      { error: "Training plan not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    plan,
  });
}
