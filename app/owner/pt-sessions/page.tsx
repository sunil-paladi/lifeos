import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";
import PTSessionsClient from "./PTSessionsClient";

export default async function OwnerPTSessionsPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) redirect("/login");

  const membership = await prisma.gymMembership.findFirst({
    where: {
      userId: session.user.id,
      role: "OWNER",
      status: "ACTIVE",
    },
    orderBy: { joinedAt: "desc" },
    select: { gymId: true },
  });

  if (!membership) redirect("/");

  return <PTSessionsClient gymId={membership.gymId} />;
}