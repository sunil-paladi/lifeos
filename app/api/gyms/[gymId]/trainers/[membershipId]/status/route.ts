import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/app/lib/authorization";

type RouteContext = {
  params: Promise<{
    gymId: string;
    membershipId: string;
  }>;
};

export async function PATCH(
  request: Request,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status =
    typeof body === "object" &&
    body !== null &&
    "status" in body &&
    (body.status === "ACTIVE" || body.status === "INACTIVE")
      ? body.status
      : null;

  if (!status) {
    return NextResponse.json(
      { error: "Status must be ACTIVE or INACTIVE" },
      { status: 400 }
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
      status: true,
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Trainer membership not found in this gym" },
      { status: 404 }
    );
  }

  if (membership.status !== "ACTIVE" && membership.status !== "INACTIVE") {
    return NextResponse.json(
      { error: "This membership is not eligible for activation changes" },
      { status: 409 }
    );
  }

  if (membership.status === status) {
    return NextResponse.json(
      { error: `Membership is already ${status.toLowerCase()}` },
      { status: 409 }
    );
  }

  const updatedMembership = await prisma.$transaction(async (tx) => {
    const updated = await tx.gymMembership.update({
      where: { id: membership.id },
      data: { status },
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
        joinedAt: true,
        updatedAt: true,
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
        membershipId: membership.id,
        status,
        changedById: user.id,
      },
    });

    return updated;
  });

  return NextResponse.json({
    success: true,
    membership: updatedMembership,
  });
}