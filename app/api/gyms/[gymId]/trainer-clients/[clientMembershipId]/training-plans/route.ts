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

export async function POST(
  request: Request,
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