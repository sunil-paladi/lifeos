import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireGymRole } from "@/app/lib/authorization";

type TrainerClientDetailRouteContext = {
  params: Promise<{
    gymId: string;
    clientMembershipId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: TrainerClientDetailRouteContext
) {
  const { gymId, clientMembershipId } = await context.params;

  const access = await requireGymRole(gymId, ["TRAINER"]);

  if (!access.ok) {
    return access.response;
  }

  const assignment = await prisma.trainerClient.findUnique({
    where: {
      gymId_trainerMembershipId_clientMembershipId: {
        gymId,
        trainerMembershipId: access.membership.id,
        clientMembershipId,
      },
    },
    select: {
      assignedAt: true,
      clientMembership: {
        select: {
          status: true,
          joinedAt: true,
          user: {
            select: {
              name: true,
              username: true,
              email: true,
              phoneNumber: true,
              age: true,
              height: true,
              weight: true,
              fitnessGoal: true,
              trainingExperience: true,
              activityLevel: true,
              targetWeight: true,
              preferredTrainingDays: true,
            },
          },
        },
      },
    },
  });

  if (!assignment || assignment.clientMembership.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Client not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    client: assignment.clientMembership.user,
    membership: {
      status: assignment.clientMembership.status,
      joinedAt: assignment.clientMembership.joinedAt,
    },
    assignment: {
      assignedAt: assignment.assignedAt,
    },
  });
}
