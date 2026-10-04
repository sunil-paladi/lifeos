import { NextResponse } from "next/server";
import { parseDateOnly, parseJsonObject } from "@/app/lib/input-validation";
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

  const body = await parseJsonObject(request);

  if (!body) {
    return NextResponse.json(
      { error: "Request body must be a valid JSON object" },
      { status: 400 }
    );
  }

  if (typeof body.name !== "string" || !body.name.trim() || body.totalWeeks === undefined) {
    return NextResponse.json(
      {
        error: "name and totalWeeks are required",
      },
      { status: 400 }
    );
  }

  const totalWeeks = body.totalWeeks;

  if (typeof totalWeeks !== "number" || !Number.isInteger(totalWeeks) || totalWeeks < 1 || totalWeeks > 52) {
    return NextResponse.json(
      {
        error: "totalWeeks must be an integer from 1 to 52",
      },
      { status: 400 }
    );
  }

  const name = body.name.trim();
  const description = body.description;
  const startDate = body.startDate;
  const endDate = body.endDate;

  if (name.length > 120) {
    return NextResponse.json({ error: "name must be 120 characters or fewer" }, { status: 400 });
  }

  if (description !== undefined && description !== null && (typeof description !== "string" || description.length > 2000)) {
    return NextResponse.json({ error: "description must be a string of at most 2000 characters" }, { status: 400 });
  }

  const parsedStartDate = startDate === undefined || startDate === null || startDate === ""
    ? null
    : parseDateOnly(startDate);
  const parsedEndDate = endDate === undefined || endDate === null || endDate === ""
    ? null
    : parseDateOnly(endDate);

  if ((startDate !== undefined && startDate !== null && startDate !== "" && !parsedStartDate) ||
      (endDate !== undefined && endDate !== null && endDate !== "" && !parsedEndDate)) {
    return NextResponse.json({ error: "startDate and endDate must be valid YYYY-MM-DD dates" }, { status: 400 });
  }

  if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate) {
    return NextResponse.json({ error: "endDate must be on or after startDate" }, { status: 400 });
  }

  const isActive = body.isActive;
  if (isActive !== undefined && typeof isActive !== "boolean") {
    return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
  }

  const plan = await prisma.$transaction(async (tx) => {
    const trainingPlan = await tx.trainingPlan.create({
      data: {
        userId: assignment.clientMembership.userId,
        gymId,
        name,
        description: typeof description === "string" ? description.trim() || null : null,
        totalWeeks,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        isActive: isActive ?? false,
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