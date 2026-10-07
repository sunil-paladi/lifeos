import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireGymRole } from "@/app/lib/authorization";
import { writeAuditLog } from "@/app/lib/batch5-events";
import { parseJsonObject } from "@/app/lib/input-validation";

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

export async function DELETE(
  request: Request,
  context: TrainerClientDetailRouteContext
) {
  const { gymId, clientMembershipId } = await context.params;
  const access = await requireGymRole(gymId, ["OWNER"]);

  if (!access.ok) {
    return access.response;
  }

  const body = await parseJsonObject(request);
  const trainerMembershipId = body?.trainerMembershipId;

  if (
    typeof trainerMembershipId !== "string" ||
    !trainerMembershipId.trim() ||
    trainerMembershipId.length > 128
  ) {
    return NextResponse.json(
      { error: "trainerMembershipId is required and must be a valid ID" },
      { status: 400 }
    );
  }

  const assignment = await prisma.trainerClient.findUnique({
    where: {
      gymId_trainerMembershipId_clientMembershipId: {
        gymId,
        trainerMembershipId,
        clientMembershipId,
      },
    },
    select: { id: true },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Trainer assignment not found" }, { status: 404 });
  }

  const removed = await prisma.$transaction(async (tx) => {
    const result = await tx.trainerClient.deleteMany({
      where: { id: assignment.id, gymId },
    });

    if (result.count === 0) {
      return false;
    }

    await writeAuditLog(tx, {
      gymId,
      actorUserId: access.user.id,
      action: "TRAINER_CLIENT_UNASSIGNED",
      subjectType: "TrainerClient",
      subjectId: assignment.id,
      metadata: { trainerMembershipId, clientMembershipId },
    });

    return true;
  });

  if (!removed) {
    return NextResponse.json({ error: "Trainer assignment not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
