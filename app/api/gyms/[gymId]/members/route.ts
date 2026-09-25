import { NextResponse } from "next/server";
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