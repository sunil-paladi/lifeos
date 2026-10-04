import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireGymRole } from "@/app/lib/authorization";
import { parseJsonObject } from "@/app/lib/input-validation";

type TrainerClientRouteContext = {
  params: Promise<{
    gymId: string;
  }>;
};

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ gymId: string }>;
  }
) {
  const { gymId } = await params;

  const access = await requireGymRole(gymId, ["OWNER"]);

  if (!access.ok) {
    return access.response;
  }

  const body = await parseJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: "Request body must be a valid JSON object" }, { status: 400 });
  }

  const { trainerMembershipId, clientMembershipId } = body;

  if (
    typeof trainerMembershipId !== "string" ||
    typeof clientMembershipId !== "string"
  ) {
    return NextResponse.json(
      {
        error:
          "trainerMembershipId and clientMembershipId are required",
      },
      { status: 400 }
    );
  }

  const trainerMembership =
    await prisma.gymMembership.findFirst({
      where: {
        id: trainerMembershipId,
        gymId,
        role: "TRAINER",
        status: "ACTIVE",
      },
    });

  if (!trainerMembership) {
    return NextResponse.json(
      {
        error:
          "Active trainer membership not found in this gym",
      },
      { status: 404 }
    );
  }

  const clientMembership =
    await prisma.gymMembership.findFirst({
      where: {
        id: clientMembershipId,
        gymId,
        role: "MEMBER",
        status: "ACTIVE",
      },
    });

  if (!clientMembership) {
    return NextResponse.json(
      {
        error:
          "Active client membership not found in this gym",
      },
      { status: 404 }
    );
  }

  const existingAssignment =
    await prisma.trainerClient.findUnique({
      where: {
        gymId_trainerMembershipId_clientMembershipId: {
          gymId,
          trainerMembershipId,
          clientMembershipId,
        },
      },
    });

  if (existingAssignment) {
    return NextResponse.json(
      {
        error:
          "Client is already assigned to this trainer",
      },
      { status: 409 }
    );
  }

  const assignment =
    await prisma.trainerClient.create({
      data: {
        gymId,
        trainerMembershipId,
        clientMembershipId,
      },
    });

  return NextResponse.json(
    {
      message: "Client assigned to trainer successfully",
      assignment,
    },
    { status: 201 }
  );
}

export async function GET(
  request: Request,
  context: TrainerClientRouteContext
) {
  const { gymId } = await context.params;

  const access = await requireGymRole(gymId, ["OWNER", "TRAINER"]);

  if (!access.ok) {
    return access.response;
  }

  const membership = access.membership;

  const assignments = await prisma.trainerClient.findMany({
    where:
      membership.role === "OWNER"
        ? {
            gymId,
            clientMembership: {
              is: { role: "MEMBER", status: "ACTIVE" },
            },
          }
        : {
            gymId,
            trainerMembershipId: membership.id,
            clientMembership: {
              is: { role: "MEMBER", status: "ACTIVE" },
            },
          },
    select: {
      id: true,
      assignedAt: true,
      clientMembershipId: true,
      clientMembership: {
        select: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              email: true,
            },
          },
        },
      },
      trainerMembership: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
  });

  return NextResponse.json({
    success: true,
    clients: assignments.map((assignment) => ({
      assignmentId: assignment.id,
      assignedAt: assignment.assignedAt,
      clientMembershipId: assignment.clientMembershipId,
      client: assignment.clientMembership.user,
      trainer: assignment.trainerMembership.user,
    })),
  });
}
