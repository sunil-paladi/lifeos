import type { Prisma } from "@/app/generated/prisma/client";

type AuditAction =
  | "TRAINER_CLIENT_ASSIGNED"
  | "MEMBERSHIP_PLAN_ASSIGNED"
  | "MEMBERSHIP_STATUS_CHANGED"
  | "PT_SESSION_CREATED"
  | "PT_SESSION_UPDATED"
  | "PT_SESSION_CANCELLED"
  | "PAYMENT_CREATED"
  | "PAYMENT_UPDATED";

type AuditEvent = {
  gymId: string;
  actorUserId: string;
  action: AuditAction;
  subjectType: string;
  subjectId: string;
  metadata?: Prisma.InputJsonObject;
};

const auditMetadataKeys: Record<AuditAction, readonly string[]> = {
  TRAINER_CLIENT_ASSIGNED: ["trainerMembershipId", "clientMembershipId"],
  MEMBERSHIP_PLAN_ASSIGNED: ["membershipPlanId"],
  MEMBERSHIP_STATUS_CHANGED: ["status"],
  PT_SESSION_CREATED: ["trainerMembershipId", "clientMembershipId", "scheduledAt"],
  PT_SESSION_UPDATED: ["fields", "scheduledAt"],
  PT_SESSION_CANCELLED: ["fields", "scheduledAt"],
  PAYMENT_CREATED: ["paymentType", "status"],
  PAYMENT_UPDATED: ["fields"],
};

export type Batch5NotificationEvent = {
  recipientUserId: string;
  gymId: string;
  type:
    | "TRAINER_CLIENT_ASSIGNED"
    | "PT_SESSION_CREATED"
    | "PT_SESSION_RESCHEDULED"
    | "PT_SESSION_CANCELLED";
  title: string;
  body: string;
  internalLink: string;
};

function assertInternalPath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes(":")) {
    throw new Error("Notification links must be internal paths");
  }

  return path;
}

export async function writeAuditLog(tx: Prisma.TransactionClient, event: AuditEvent) {
  const { metadata, ...data } = event;
  const metadataKeys = Object.keys(metadata ?? {});
  if (
    metadataKeys.some((key) => !auditMetadataKeys[event.action].includes(key)) ||
    JSON.stringify(metadata ?? {}).length > 2048
  ) {
    throw new Error("Audit metadata does not match the action allowlist");
  }

  await tx.auditLog.create({
    data: {
      ...data,
      ...(metadata ? { metadata } : {}),
    },
  });
}

export async function createNotifications(
  tx: Prisma.TransactionClient,
  events: Batch5NotificationEvent[],
) {
  if (events.length === 0) return;

  await tx.notification.createMany({
    data: events.map((event) => ({
      ...event,
      internalLink: assertInternalPath(event.internalLink),
    })),
  });
}

export function trainerClientPath(clientMembershipId: string) {
  return assertInternalPath(
    `/trainer/clients/${encodeURIComponent(clientMembershipId)}`,
  );
}
