import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/app/lib/authorization";

type TrainerClientTrainingPlansRouteContext = {
  params: Promise<{
    gymId: string;
    clientMembershipId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: TrainerClientTrainingPlansRouteContext
) {
  const { user, response } = await getAuthenticatedUser();

  if (!user) {
    return response;
  }

  const { gymId, clientMembershipId } = await context.params;

  const trainerMembership = await prisma.gymMembership.findFirst({
    where: {
      gymId,
      userId: user.id,
      role: "TRAINER",
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (!trainerMembership) {
    return NextResponse.json(
      { error: "Client not found" },
      { status: 404 }
    );
  }

  const assignment = await prisma.trainerClient.findUnique({
    where: {
      gymId_trainerMembershipId_clientMembershipId: {
        gymId,
        trainerMembershipId: trainerMembership.id,
        clientMembershipId,
      },
    },
    select: {
      clientMembership: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json(
      { error: "Client not found" },
      { status: 404 }
    );
  }

  const plans = await prisma.trainingPlan.findMany({
    where: {
      userId: assignment.clientMembership.userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      totalWeeks: true,
      startDate: true,
      endDate: true,
      isActive: true,
    },
  });

  return NextResponse.json({ plans });
}