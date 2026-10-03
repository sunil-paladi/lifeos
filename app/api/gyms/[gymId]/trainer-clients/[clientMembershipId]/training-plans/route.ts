import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireGymRole } from "@/app/lib/authorization";

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
      clientMembership: {
        select: {
          userId: true,
          status: true,
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

  const plans = await prisma.trainingPlan.findMany({
    where: {
      userId: assignment.clientMembership.userId,
      gymId,
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

export async function POST(
  request: Request,
  context: TrainerClientTrainingPlansRouteContext
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
      clientMembership: {
        select: {
          userId: true,
          status: true,
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

  const body = await request.json();

  if (!body.name || !body.totalWeeks) {
    return NextResponse.json(
      {
        error: "name and totalWeeks are required",
      },
      { status: 400 }
    );
  }

  const totalWeeks = Number(body.totalWeeks);

  if (!Number.isInteger(totalWeeks) || totalWeeks < 1) {
    return NextResponse.json(
      {
        error: "totalWeeks must be a positive integer",
      },
      { status: 400 }
    );
  }

  const plan = await prisma.$transaction(async (tx) => {
    const trainingPlan = await tx.trainingPlan.create({
      data: {
        userId: assignment.clientMembership.userId,
        gymId,
        name: body.name,
        description: body.description ?? null,
        totalWeeks,
        startDate: body.startDate
          ? new Date(body.startDate)
          : null,
        endDate: body.endDate
          ? new Date(body.endDate)
          : null,
        isActive: body.isActive ?? false,
      },
    });

    const phase = await tx.programPhase.create({
      data: {
        trainingPlanId: trainingPlan.id,
        name: "Phase 1",
        description: null,
        phaseOrder: 1,
        durationWeeks: totalWeeks,
        startWeek: 1,
        endWeek: totalWeeks,
      },
    });

    const dayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber++) {
      const week = await tx.programWeek.create({
        data: {
          phaseId: phase.id,
          weekNumber,
        },
      });

      await tx.workoutDay.createMany({
        data: dayNames.map((name, index) => ({
          weekId: week.id,
          dayOfWeek: index + 1,
          name,
          description: null,
          isRestDay: false,
          dayOrder: index + 1,
        })),
      });
    }

    return trainingPlan;
  });

  return NextResponse.json(
    {
      success: true,
      plan,
    },
    { status: 201 }
  );
}