import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  requireRole,
} from "@/app/lib/authorization";

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
  const { user, response } = await getAuthenticatedUser();

  if (response) {
    return response;
  }

  const roleResponse = requireRole(user, ["OWNER"]);

  if (roleResponse) {
    return roleResponse;
  }

  const { gymId } = await params;

  const body = await request.json();

  const {
    trainerMembershipId,
    clientMembershipId,
  } = body;

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

  const gym = await prisma.gym.findFirst({
    where: {
      id: gymId,
      ownerId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (!gym) {
    return NextResponse.json(
      { error: "Gym not found" },
      { status: 404 }
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
  const { user, response } = await getAuthenticatedUser();

  if (!user) {
    return response;
  }

  const { gymId } = await context.params;

  const membership = await prisma.gymMembership.findFirst({
    where: {
      gymId,
      userId: user.id,
      role: {
        in: ["OWNER", "TRAINER"],
      },
      status: "ACTIVE",
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "You are not an active member of this gym" },
      { status: 403 }
    );
  }

  const assignments = await prisma.trainerClient.findMany({
    where: {
      gymId,
      trainerMembershipId: membership.id,
    },
    include: {
      clientMembership: {
        include: {
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
      client: assignment.clientMembership.user,
    })),
  });
}

