import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  requireRole,
} from "@/app/lib/authorization";

export async function POST(request: Request) {
  const { user, response } = await getAuthenticatedUser();

  if (!user) {
    return response;
  }

  const roleError = requireRole(user, ["OWNER"]);

  if (roleError) {
    return roleError;
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

  const name =
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof body.name === "string"
      ? body.name.trim()
      : "";

  if (!name) {
    return NextResponse.json(
      { error: "Gym name is required" },
      { status: 400 }
    );
  }

  if (name.length > 100) {
    return NextResponse.json(
      { error: "Gym name must be 100 characters or less" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const gym = await tx.gym.create({
      data: {
        name,
        ownerId: user.id,
      },
    });

    const membership = await tx.gymMembership.create({
      data: {
        gymId: gym.id,
        userId: user.id,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    return { gym, membership };
  });

  return NextResponse.json(
    {
      success: true,
      gym: result.gym,
      membership: result.membership,
    },
    { status: 201 }
  );
}
