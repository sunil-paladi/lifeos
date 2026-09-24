import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CalendarDays, Mail, UserRound } from "lucide-react";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";

type AssignedClient = {
  assignmentId: string;
  assignedAt: string;
  client: {
    id: string;
    username: string | null;
    name: string;
    email: string | null;
  };
};

type TrainerClientsResponse = {
  clients?: AssignedClient[];
  error?: string;
};

async function getAssignedClients(
  gymId: string,
  requestHeaders: Headers
): Promise<TrainerClientsResponse> {
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? "http";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ??
    (host ? `${protocol}://${host}` : null);

  if (!baseUrl) {
    return { error: "Unable to connect to the trainer clients service" };
  }

  try {
    const response = await fetch(
      `${baseUrl}/api/gyms/${encodeURIComponent(gymId)}/trainer-clients`,
      {
        headers: {
          cookie: requestHeaders.get("cookie") ?? "",
        },
        cache: "no-store",
      }
    );

    const data = (await response.json()) as TrainerClientsResponse;

    if (!response.ok) {
      return { error: data.error ?? "Unable to load assigned clients" };
    }

    return data;
  } catch {
    return { error: "Unable to load assigned clients" };
  }
}

export default async function TrainerPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session) {
    redirect("/login");
  }

  const membership = await prisma.gymMembership.findFirst({
    where: {
      userId: session.user.id,
      role: "TRAINER",
      status: "ACTIVE",
    },
    orderBy: {
      joinedAt: "desc",
    },
    select: {
      gymId: true,
    },
  });

  const response = membership
    ? await getAssignedClients(membership.gymId, requestHeaders)
    : { error: "You do not have an active gym membership." };
  const clients = response.clients ?? [];

  return (
    <div className="space-y-6 py-2">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-green-600">
          Trainer workspace
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Trainer Dashboard
        </h1>
        <p className="mt-2 text-slate-600">
          Welcome, {session.user.name}. Here are the clients assigned to you.
        </p>
      </header>

      {response.error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
          <h2 className="font-semibold">Unable to load your dashboard</h2>
          <p className="mt-1 text-sm">{response.error}</p>
        </section>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-stretch">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-full items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <UserRound size={21} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Assigned clients
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-slate-900">
                    {clients.length}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-green-100 bg-green-50/70 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Workspace
              </p>
              <p className="mt-2 text-sm font-medium text-slate-700">
                Your active client roster
              </p>
            </section>
          </div>

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Assigned Clients
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Clients currently assigned to your trainer account.
                </p>
              </div>
            </div>

            {clients.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="font-medium text-slate-700">
                  No clients assigned yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Assigned clients will appear here when they are connected to your trainer account.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {clients.map(({ assignmentId, assignedAt, client }) => (
                  <article
                    key={assignmentId}
                    className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-green-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-slate-900">
                          {client.name}
                        </h3>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          @{client.username ?? "username unavailable"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                        Assigned
                      </span>
                    </div>

                    <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                      {client.email ? (
                        <div className="flex items-start gap-2.5 text-sm text-slate-600">
                          <Mail className="mt-0.5 shrink-0 text-slate-400" size={16} />
                          <span className="break-all">{client.email}</span>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2.5 text-xs text-slate-500">
                        <CalendarDays className="shrink-0 text-slate-400" size={16} />
                        <span>
                          Assigned {new Date(assignedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}