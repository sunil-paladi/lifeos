import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";

type GymRole = "OWNER" | "TRAINER" | "MEMBER";

export async function getAuthenticatedUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      ),
    };
  }

  return {
    user,
    response: null,
  };
}

export function requireRole(
  user: { role?: string },
  roles: string[]
) {
  if (!user.role || !roles.includes(user.role)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  return null;
}

export async function requireGymRole(
  gymId: string,
  roles: readonly GymRole[]
) {
  const authResult = await getAuthenticatedUser();

  if (!authResult.user) {
    return {
      ok: false as const,
      response:
        authResult.response ??
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const membership = await prisma.gymMembership.findFirst({
    where: {
      gymId,
      userId: authResult.user.id,
      role: { in: [...roles] },
      status: "ACTIVE",
    },
    select: {
      id: true,
      gymId: true,
      userId: true,
      role: true,
      status: true,
    },
  });

  if (!membership) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "You do not have an active membership with the required gym role" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true as const,
    user: authResult.user,
    membership,
  };
}
