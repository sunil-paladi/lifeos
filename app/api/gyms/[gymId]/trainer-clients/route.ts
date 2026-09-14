import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  requireRole,
} from "@/app/lib/authorization";

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
