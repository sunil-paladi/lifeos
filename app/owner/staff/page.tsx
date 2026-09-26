import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";
import MembershipActions from "../MembershipActions";
import CreateTrainerForm from "./CreateTrainerForm";

type Trainer = {
  membershipId: string;
  userId: string;
  name: string;
  username: string | null;
  email: string | null;
  role: "TRAINER";
  status: string;
  joinedAt: string;
};

type TrainersResponse = {
  trainers?: Trainer[];
  error?: string;
};

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

async function getTrainers(
  gymId: string,
  requestHeaders: Headers
): Promise<TrainersResponse> {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  const baseUrl = configuredUrl
    ? configuredUrl.replace(/\/$/, "")
    : host
      ? `${protocol}://${host}`
      : null;

  if (!baseUrl) {
    return { error: "Unable to connect to the staff service" };
  }

  try {
    const response = await fetch(
      `${baseUrl}/api/gyms/${encodeURIComponent(gymId)}/trainers`,
      {
        headers: { cookie: requestHeaders.get("cookie") ?? "" },
        cache: "no-store",
      }
    );
    const data = (await response.json()) as TrainersResponse;

    return response.ok
      ? data
      : { error: data.error ?? "Unable to load staff" };
  } catch {
    return { error: "Unable to load staff" };
  }
}

export default async function OwnerStaffPage() {
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
    orderBy: { joinedAt: "desc" },
    select: { gymId: true },
  });

  const response = membership
    ? await getTrainers(membership.gymId, requestHeaders)
    : { error: "You do not have an active owner membership." };
  const trainers = response.trainers ?? [];

  return (
    <div className="space-y-6 py-2">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-green-600">
          Gym management
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Staff / Trainers
        </h1>
        <p className="mt-2 text-slate-600">
          Manage the trainers connected to your active gym.
        </p>
      </header>

      {membership ? <CreateTrainerForm gymId={membership.gymId} /> : null}

      {response.error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
          <h2 className="font-semibold">Unable to load staff</h2>
          <p className="mt-1 text-sm">{response.error}</p>
        </section>
      ) : trainers.length === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-medium text-slate-700">No trainers yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Trainers will appear here when they are added to this gym.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="font-bold text-slate-900">Gym staff</h2>
            <p className="mt-1 text-sm text-slate-500">
              {trainers.length} trainer{trainers.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {trainers.map((trainer) => (
              <article
                key={trainer.membershipId}
                className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] sm:items-center sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{trainer.name}</p>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {trainer.username ? `@${trainer.username}` : "Username unavailable"}
                  </p>
                </div>
                <p className="truncate text-sm text-slate-600">
                  {trainer.email ?? "Email unavailable"}
                </p>
                <span className="w-fit rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {formatLabel(trainer.role)}
                </span>
                <div className="text-sm text-slate-500 sm:text-right">
                  <p className="font-medium text-slate-700">{formatLabel(trainer.status)}</p>
                  <p className="mt-1 text-xs">Joined {formatDate(trainer.joinedAt)}</p>
                </div>
                {membership ? (
                  <MembershipActions
                    gymId={membership.gymId}
                    membershipId={trainer.membershipId}
                    role="TRAINER"
                    status={trainer.status}
                  />
                ) : null}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
