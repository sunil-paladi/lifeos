import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/app/lib/authorization";

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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "Name, username, email, and password are required" },
      { status: 400 }
    );
  }

  const name =
    "name" in body && typeof body.name === "string"
      ? body.name.trim()
      : "";
  const username =
    "username" in body && typeof body.username === "string"
      ? body.username.trim()
      : "";
  const email =
    "email" in body && typeof body.email === "string"
      ? body.email.trim()
      : "";
  const password =
    "password" in body && typeof body.password === "string"
      ? body.password
      : "";

  if (!name || !username || !email || !password) {
    return NextResponse.json(
      { error: "Name, username, email, and password are required" },
      { status: 400 }
    );
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

    return NextResponse.json(
      { error: "Unable to create client account" },
      { status: 500 }
    );
  }
}