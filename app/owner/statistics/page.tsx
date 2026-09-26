import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";
import OwnerStatisticsClient from "./OwnerStatisticsClient";

export default async function OwnerStatisticsPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    redirect("/login");
  }

  const membership = await prisma.gymMembership.findFirst({
    where: {
      userId: session.user.id,
      role: "OWNER",
      status: "ACTIVE",
    },
    orderBy: {
      joinedAt: "desc",
    },
    select: {
      gymId: true,
      gym: {
        select: { name: true },
      },
    },
  });

  if (!membership) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <h1 className="text-xl font-bold">Owner statistics unavailable</h1>
        <p className="mt-2 text-sm">You do not have an active owner membership in a gym.</p>
      </section>
    );
  }

  return (
    <OwnerStatisticsClient
      gymId={membership.gymId}
      gymName={membership.gym.name}
    />
  );
}
