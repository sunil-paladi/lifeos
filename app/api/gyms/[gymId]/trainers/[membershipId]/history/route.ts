import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/app/lib/authorization";

type RouteContext = {
  params: Promise<{
    gymId: string;
    membershipId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const { user, response } = await getAuthenticatedUser();

  if (!user) {
    return response;
  }

  const { gymId, membershipId } = await context.params;
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

  const membership = await prisma.gymMembership.findFirst({
    where: {
      id: membershipId,
      gymId,
      role: "TRAINER",
    },
    select: {
      id: true,
      gymId: true,
      role: true,
      status: true,
      joinedAt: true,
      updatedAt: true,
      gym: { select: { name: true } },
      user: {
        select: {
          name: true,
          username: true,
          email: true,
        },
      },
      statusHistory: {
        orderBy: { changedAt: "desc" },
        select: {
          status: true,
          changedAt: true,
          changedBy: {
            select: {
              name: true,
              username: true,
            },
          },
        },
      },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Trainer membership not found in this gym" },
      { status: 404 }
    );
  }

  return NextResponse.json({ membership });
}