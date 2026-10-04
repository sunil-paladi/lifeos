import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { jsonError, logServerError } from "@/app/lib/error-response";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { GymMembershipStatus } from "@/app/generated/prisma/enums";
import { parseJsonObject } from "@/app/lib/input-validation";

type RouteContext = {
  params: Promise<{
    gymId: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  const { user, response } = await getAuthenticatedUser();

  if (!user) {
    return response;
  }

  const { gymId } = await context.params;

  const ownerMembership = await prisma.gymMembership.findFirst({
    where: {
      gymId,
      userId: user.id,
      role: "OWNER",
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (!ownerMembership) {
    return NextResponse.json(
      { error: "You are not an active owner of this gym" },
      { status: 403 }
    );
  }

  const trainers = await prisma.gymMembership.findMany({
    where: {
      gymId,
      role: "TRAINER",
      status:
        new URL(request.url).searchParams.get("status") === "ACTIVE"
          ? "ACTIVE"
          : {
              in: [
                GymMembershipStatus.ACTIVE,
                GymMembershipStatus.INACTIVE,
              ],
            },
    },
    orderBy: {
      joinedAt: "asc",
    },
    select: {
      id: true,
      status: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
        },
      },
    },
  });

  return NextResponse.json({
    trainers: trainers.map((trainer) => ({
      membershipId: trainer.id,
      userId: trainer.user.id,
      name: trainer.user.name,
      username: trainer.user.username,
      email: trainer.user.email,
      role: "TRAINER" as const,
      status: trainer.status,
      joinedAt: trainer.joinedAt,
    })),
  });
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  const { user, response } = await getAuthenticatedUser();

  if (!user) {
    return response;
  }

  const { gymId } = await context.params;

  const ownerMembership = await prisma.gymMembership.findFirst({
    where: {
      gymId,
      userId: user.id,
      role: "OWNER",
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (!ownerMembership) {
    return NextResponse.json(
      { error: "You are not an active owner of this gym" },
      { status: 403 }
    );
  }

  const body = await parseJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: "Request body must be a valid JSON object" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username) {
    return NextResponse.json(
      { error: "Trainer username is required" },
      { status: 400 }
    );
  }

  if (username.length < 3 || username.length > 30 || !/^[A-Za-z0-9_]+$/.test(username)) {
    return NextResponse.json({ error: "username must contain 3 to 30 letters, numbers, or underscores" }, { status: 400 });
  }

  if (name || email || password) {
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, username, email, and password are required" },
        { status: 400 }
      );
    }

    if (name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Name or email is outside the supported format" }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: "Password must contain 8 to 128 characters" }, { status: 400 });
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username is already in use" },
        { status: 409 }
      );
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email is already in use" },
        { status: 409 }
      );
    }

    let createdUserId: string | null = null;

    try {
      const signup = await auth.api.signUpEmail({
        body: {
          name,
          username,
          email,
          password,
        },
      });

      createdUserId = signup.user.id;

      const result = await prisma.$transaction(async (tx) => {
        const membership = await tx.gymMembership.create({
          data: {
            gymId,
            userId: signup.user.id,
            role: "TRAINER",
            status: "ACTIVE",
          },
          select: {
            id: true,
            userId: true,
            role: true,
            status: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
              },
            },
          },
        });

        await tx.gymMembershipStatusHistory.create({
          data: {
            gymId,
            membershipId: membership.id,
            status: "ACTIVE",
            changedById: user.id,
          },
        });

        return membership;
      });

      return NextResponse.json(
        {
          success: true,
          trainer: result.user,
          membership: {
            id: result.id,
            userId: result.userId,
            role: result.role,
            status: result.status,
            joinedAt: result.joinedAt,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      if (createdUserId) {
        await prisma.user.delete({
          where: { id: createdUserId },
        }).catch(() => undefined);
      }

      const message =
        error instanceof Error ? error.message.toLowerCase() : "";

      if (message.includes("username")) {
        return NextResponse.json(
          { error: "Username is already in use" },
          { status: 409 }
        );
      }

      if (message.includes("email")) {
        return NextResponse.json(
          { error: "Email is already in use" },
          { status: 409 }
        );
      }

      logServerError("POST /api/gyms/[gymId]/trainers", error);
      return jsonError("Unable to create trainer account", 500);
    }
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

  const membership = await prisma.$transaction(async (tx) => {
    const createdMembership = await tx.gymMembership.create({
      data: {
        gymId,
        userId: trainer.id,
        role: "TRAINER",
        status: "ACTIVE",
      },
    });

    await tx.gymMembershipStatusHistory.create({
      data: {
        gymId,
        membershipId: createdMembership.id,
        status: "ACTIVE",
        changedById: user.id,
      },
    });

    return createdMembership;
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
