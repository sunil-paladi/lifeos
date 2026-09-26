import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { getPTSessionMembership, isValidSessionDuration, parseScheduledAt } from "@/app/lib/pt-sessions";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ gymId: string; sessionId: string }>;
};

const sessionSelect = {
  id: true,
  gymId: true,
  trainerMembershipId: true,
  clientMembershipId: true,
  scheduledAt: true,
  durationMinutes: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  trainerMembership: {
    select: { user: { select: { id: true, name: true } } },
  },
  clientMembership: {
    select: { user: { select: { id: true, name: true } } },
  },
} as const;

async function getScopedSession(sessionId: string, gymId: string, membership: { id: string; role: string }) {
  return prisma.pTSession.findFirst({
    where: {
      id: sessionId,
      gymId,
      ...(membership.role === "TRAINER"
        ? {
            trainerMembershipId: membership.id,
            clientMembership: {
              is: {
                clientAssignments: {
                  some: {
                    gymId,
                    trainerMembershipId: membership.id,
                  },
                },
              },
            },
          }
        : {}),
    },
    select: sessionSelect,
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const { gymId, sessionId } = await context.params;
  const membership = await getPTSessionMembership(user.id, gymId);

  if (!membership) {
    return NextResponse.json({ error: "You are not an active owner or trainer in this gym" }, { status: 403 });
  }

  const session = await getScopedSession(sessionId, gymId, membership);
  if (!session) {
    return NextResponse.json({ error: "PT session not found" }, { status: 404 });
  }

  return NextResponse.json({ session });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const { gymId, sessionId } = await context.params;
  const membership = await getPTSessionMembership(user.id, gymId);

  if (!membership) {
    return NextResponse.json({ error: "You are not an active owner or trainer in this gym" }, { status: 403 });
  }

  const session = await getScopedSession(sessionId, gymId, membership);
  if (!session) {
    return NextResponse.json({ error: "PT session not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const hasScheduledAt = Object.hasOwn(body, "scheduledAt");
  const hasDuration = Object.hasOwn(body, "durationMinutes");
  const hasNotes = Object.hasOwn(body, "notes");
  const hasStatus = Object.hasOwn(body, "status");

  if (!hasScheduledAt && !hasDuration && !hasNotes && !hasStatus) {
    return NextResponse.json({ error: "At least one editable field is required" }, { status: 400 });
  }

  if (hasScheduledAt && !parseScheduledAt(body.scheduledAt)) {
    return NextResponse.json({ error: "scheduledAt must be a valid date and time" }, { status: 400 });
  }

  if (hasDuration && !isValidSessionDuration(body.durationMinutes)) {
    return NextResponse.json({ error: "durationMinutes must be an integer from 1 to 480" }, { status: 400 });
  }

  if (hasNotes && body.notes !== null && typeof body.notes !== "string") {
    return NextResponse.json({ error: "notes must be a string or null" }, { status: 400 });
  }

  if (hasStatus && !["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"].includes(String(body.status))) {
    return NextResponse.json({ error: "status is not a valid PT session status" }, { status: 400 });
  }

  if (session.status !== "SCHEDULED" && (hasScheduledAt || hasDuration)) {
    return NextResponse.json({ error: "Completed or cancelled sessions cannot be rescheduled" }, { status: 409 });
  }

  if (hasStatus && body.status !== session.status && session.status !== "SCHEDULED") {
    return NextResponse.json({ error: "Only scheduled sessions can change status" }, { status: 409 });
  }

  const updated = await prisma.pTSession.update({
    where: { id: session.id },
    data: {
      ...(hasScheduledAt ? { scheduledAt: parseScheduledAt(body.scheduledAt)! } : {}),
      ...(hasDuration ? { durationMinutes: body.durationMinutes as number } : {}),
      ...(hasNotes ? { notes: typeof body.notes === "string" ? body.notes.trim() || null : null } : {}),
      ...(hasStatus ? { status: body.status as "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" } : {}),
    },
    select: sessionSelect,
  });

  return NextResponse.json({ session: updated });
}