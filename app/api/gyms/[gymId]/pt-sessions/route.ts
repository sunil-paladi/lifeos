import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { getPTSessionMembership, isValidSessionDuration, parseScheduledAt } from "@/app/lib/pt-sessions";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ gymId: string }>;
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

export async function GET(_request: Request, context: RouteContext) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const { gymId } = await context.params;
  const membership = await getPTSessionMembership(user.id, gymId);

  if (!membership) {
    return NextResponse.json({ error: "You are not an active owner or trainer in this gym" }, { status: 403 });
  }

  const sessions = await prisma.pTSession.findMany({
    where: membership.role === "OWNER"
      ? { gymId }
      : {
          gymId,
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
        },
    select: sessionSelect,
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json({ sessions, serverTime: new Date().toISOString() });
}

export async function POST(request: Request, context: RouteContext) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const { gymId } = await context.params;
  const membership = await getPTSessionMembership(user.id, gymId);

  if (!membership) {
    return NextResponse.json({ error: "You are not an active owner or trainer in this gym" }, { status: 403 });
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

  if (membership.role === "TRAINER" && body.trainerMembershipId !== undefined && body.trainerMembershipId !== membership.id) {
    return NextResponse.json({ error: "Trainers can only create their own sessions" }, { status: 403 });
  }

  const trainerMembershipId = membership.role === "TRAINER"
    ? membership.id
    : body.trainerMembershipId;
  const clientMembershipId = body.clientMembershipId;
  const scheduledAt = parseScheduledAt(body.scheduledAt);

  if (typeof trainerMembershipId !== "string" || typeof clientMembershipId !== "string") {
    return NextResponse.json({ error: "trainerMembershipId and clientMembershipId are required" }, { status: 400 });
  }

  if (!scheduledAt) {
    return NextResponse.json({ error: "scheduledAt must be a valid date and time" }, { status: 400 });
  }

  if (!isValidSessionDuration(body.durationMinutes)) {
    return NextResponse.json({ error: "durationMinutes must be an integer from 1 to 480" }, { status: 400 });
  }

  if (body.notes !== undefined && body.notes !== null && typeof body.notes !== "string") {
    return NextResponse.json({ error: "notes must be a string or null" }, { status: 400 });
  }

  const [trainerMembership, clientMembership] = await Promise.all([
    prisma.gymMembership.findFirst({
      where: {
        id: trainerMembershipId,
        gymId,
        role: "TRAINER",
        status: "ACTIVE",
      },
      select: { id: true },
    }),
    prisma.gymMembership.findFirst({
      where: {
        id: clientMembershipId,
        gymId,
        role: "MEMBER",
        status: "ACTIVE",
      },
      select: { id: true },
    }),
  ]);

  if (!trainerMembership || !clientMembership) {
    return NextResponse.json({ error: "An active trainer and client membership in this gym are required" }, { status: 404 });
  }

  const assignment = await prisma.trainerClient.findUnique({
    where: {
      gymId_trainerMembershipId_clientMembershipId: {
        gymId,
        trainerMembershipId,
        clientMembershipId,
      },
    },
    select: { id: true },
  });

  if (!assignment) {
    return NextResponse.json({ error: "The client is not assigned to this trainer" }, { status: 403 });
  }

  const session = await prisma.pTSession.create({
    data: {
      gymId,
      trainerMembershipId,
      clientMembershipId,
      scheduledAt,
      durationMinutes: body.durationMinutes,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    },
    select: sessionSelect,
  });

  return NextResponse.json({ session }, { status: 201 });
}