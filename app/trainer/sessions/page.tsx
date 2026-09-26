import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";
import PTSessionsClient from "./PTSessionsClient";

export default async function TrainerSessionsPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    redirect("/login");
  }

  const membership = await prisma.gymMembership.findFirst({
    where: {
      userId: session.user.id,
      role: "TRAINER",
      status: "ACTIVE",
    },
    orderBy: { joinedAt: "desc" },
    select: { gymId: true },
  });

  if (!membership) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <h1 className="font-semibold">PT Sessions unavailable</h1>
        <p className="mt-1 text-sm">You do not have an active trainer membership.</p>
      </section>
    );
  }

  return <PTSessionsClient gymId={membership.gymId} />;
}