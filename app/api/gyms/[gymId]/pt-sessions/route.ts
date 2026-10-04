import { NextResponse } from "next/server";
import { requireGymRole } from "@/app/lib/authorization";
import { isValidSessionDuration, parseScheduledAt } from "@/app/lib/pt-sessions";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ gymId: string }>;
};

const sessionSelect = {
  id: true,
  gymId: true,
  trainerMembershipId: true,
  clientMembershipId: true,
  ptPricingId: true,
  scheduledAt: true,
  durationMinutes: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  ptPricing: {
    select: {
      id: true,
      name: true,
      price: true,
      currency: true,
      durationMinutes: true,
    },
  },
  trainerMembership: {
    select: { user: { select: { id: true, name: true } } },
  },
  clientMembership: {
    select: { user: { select: { id: true, name: true } } },
  },
} as const;

export async function GET(_request: Request, context: RouteContext) {
  const { gymId } = await context.params;
  const access = await requireGymRole(gymId, ["OWNER", "TRAINER"]);

  if (!access.ok) {
    return access.response;
  }

  const membership = access.membership;

  const sessions = await prisma.pTSession.findMany({
    where: {
      gymId,
      clientMembership: {
        is: {
          role: "MEMBER",
          status: "ACTIVE",
          ...(membership.role === "TRAINER"
            ? {
                clientAssignments: {
                  some: {
                    gymId,
                    trainerMembershipId: membership.id,
                  },
                },
              }
            : {}),
        },
      },
      ...(membership.role === "TRAINER"
        ? { trainerMembershipId: membership.id }
        : {}),
    },
    select: sessionSelect,
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json({ sessions, serverTime: new Date().toISOString() });
}

export async function POST(request: Request, context: RouteContext) {
  const { gymId } = await context.params;
  const access = await requireGymRole(gymId, ["OWNER", "TRAINER"]);

  if (!access.ok) {
    return access.response;
  }

  const membership = access.membership;

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
  const ptPricingId = body.ptPricingId === undefined ? null : body.ptPricingId;
  const scheduledAt = parseScheduledAt(body.scheduledAt);
  const status = body.status === undefined ? "SCHEDULED" : body.status;

  if (typeof trainerMembershipId !== "string" || !trainerMembershipId.trim() || trainerMembershipId.length > 128 ||
      typeof clientMembershipId !== "string" || !clientMembershipId.trim() || clientMembershipId.length > 128) {
    return NextResponse.json({ error: "trainerMembershipId and clientMembershipId are required" }, { status: 400 });
  }

  if (!scheduledAt) {
    return NextResponse.json({ error: "scheduledAt must be a valid date and time" }, { status: 400 });
  }

  if (!isValidSessionDuration(body.durationMinutes)) {
    return NextResponse.json({ error: "durationMinutes must be an integer from 1 to 480" }, { status: 400 });
  }

  if (ptPricingId !== null && (typeof ptPricingId !== "string" || !ptPricingId.trim() || ptPricingId.length > 128)) {
    return NextResponse.json({ error: "ptPricingId must be a valid pricing ID or null" }, { status: 400 });
  }

  if (!( ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const).includes(status as "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW")) {
    return NextResponse.json({ error: "status is not a valid PT session status" }, { status: 400 });
  }

  if (body.notes !== undefined && body.notes !== null && (typeof body.notes !== "string" || body.notes.length > 2000)) {
    return NextResponse.json({ error: "notes must be a string of at most 2000 characters or null" }, { status: 400 });
  }

  const [trainerMembership, clientMembership, ptPricing] = await Promise.all([
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
    ptPricingId === null
      ? Promise.resolve(null)
      : prisma.pTPricing.findFirst({
          where: { id: ptPricingId, gymId, isActive: true },
          select: { id: true },
        }),
  ]);

  if (!trainerMembership || !clientMembership) {
    return NextResponse.json({ error: "An active trainer and client membership in this gym are required" }, { status: 404 });
  }

  if (ptPricingId !== null && !ptPricing) {
    return NextResponse.json({ error: "Active PT pricing not found in this gym" }, { status: 404 });
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
      ptPricingId,
      scheduledAt,
      durationMinutes: body.durationMinutes,
      status: status as "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW",
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    },
    select: sessionSelect,
  });

  return NextResponse.json({ session }, { status: 201 });
}