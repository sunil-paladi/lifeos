import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  requireRole,
} from "@/app/lib/authorization";

type RouteContext = {
  params: Promise<{
    gymId: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  const { user, response } = await getAuthenticatedUser();

  if (!user) {
    return response;
  }

  const roleError = requireRole(user, ["OWNER"]);

  if (roleError) {
    return roleError;
  }

  const { gymId } = await context.params;

  // Make sure this gym belongs to the authenticated OWNER.
  const gym = await prisma.gym.findFirst({
    where: {
      id: gymId,
      ownerId: user.id,
    },
  });

  if (!gym) {
    return NextResponse.json(
      { error: "Gym not found" },
      { status: 404 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const username =
    typeof body === "object" &&
    body !== null &&
    "username" in body &&
    typeof body.username === "string"
      ? body.username.trim()
      : "";

  if (!username) {
    return NextResponse.json(
      { error: "Trainer username is required" },
      { status: 400 }
    );
  }

  const trainer = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
      username: true,
      name: true,
    },
  });

  if (!trainer) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  if (trainer.id === user.id) {
    return NextResponse.json(
      { error: "Owner cannot be added as their own trainer" },
      { status: 400 }
    );
  }

  const existingMembership =
    await prisma.gymMembership.findUnique({
      where: {
        gymId_userId: {
          gymId,
          userId: trainer.id,
        },
      },
    });

  if (existingMembership) {
    return NextResponse.json(
      {
        error: "User is already a member of this gym",
        membership: existingMembership,
      },
      { status: 409 }
    );
  }

  const membership =
    await prisma.gymMembership.create({
      data: {
        gymId,
        userId: trainer.id,
        role: "TRAINER",
        status: "ACTIVE",
      },
    });

  return NextResponse.json(
    {
      success: true,
      trainer,
      membership,
    },
    { status: 201 }
  );
}
