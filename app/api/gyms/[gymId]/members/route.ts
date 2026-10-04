import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { jsonError, logServerError } from "@/app/lib/error-response";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { parseJsonObject } from "@/app/lib/input-validation";

type GymMembersRouteContext = {
  params: Promise<{
    gymId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: GymMembersRouteContext
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

  const memberships = await prisma.gymMembership.findMany({
    where: {
      gymId,
    },
    orderBy: {
      joinedAt: "asc",
    },
    select: {
      id: true,
      userId: true,
      role: true,
      status: true,
      joinedAt: true,
      user: {
        select: {
          name: true,
          username: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({
    memberships: memberships.map((membership) => ({
      id: membership.id,
      userId: membership.userId,
      name: membership.user.name,
      username: membership.user.username,
      email: membership.user.email,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joinedAt,
    })),
  });
}

export async function POST(
  request: Request,
  context: GymMembersRouteContext
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

  const body = await parseJsonObject(request);
  if (!body) {
    return NextResponse.json(
      { error: "Name, username, email, and password are required" },
      { status: 400 }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !username || !email || !password) {
    return NextResponse.json(
      { error: "Name, username, email, and password are required" },
      { status: 400 }
    );
  }

  if (name.length > 100 || username.length < 3 || username.length > 30 || !/^[A-Za-z0-9_]+$/.test(username)) {
    return NextResponse.json({ error: "Name or username is outside the supported format" }, { status: 400 });
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email must be a valid email address" }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Password must contain 8 to 128 characters" }, { status: 400 });
  }

  const existingUsername = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
    },
  });

  if (existingUsername) {
    return NextResponse.json(
      { error: "Username is already in use" },
      { status: 409 }
    );
  }

  const existingEmail = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
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

      const membership = await prisma.$transaction(async (tx) => {
        const createdMembership = await tx.gymMembership.create({
          data: {
            gymId,
            userId: signup.user.id,
            role: "MEMBER",
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
        member: {
          id: membership.id,
          userId: membership.userId,
          name: membership.user.name,
          username: membership.user.username,
          email: membership.user.email,
          role: membership.role,
          status: membership.status,
          joinedAt: membership.joinedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (createdUserId) {
      await prisma.user.delete({
        where: {
          id: createdUserId,
        },
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

    logServerError("POST /api/gyms/[gymId]/members", error);
    return jsonError("Unable to create client account", 500);
  }
}