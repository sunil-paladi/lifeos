import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Mail, Phone, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";

type ClientWorkspace = {
  client: {
    name: string;
    username: string | null;
    email: string | null;
    phoneNumber: string | null;
    age: number | null;
    height: number | null;
    weight: number | null;
    fitnessGoal: string | null;
    trainingExperience: string | null;
    activityLevel: string | null;
    targetWeight: number | null;
    preferredTrainingDays: number | null;
  };
  membership: {
    status: string;
    joinedAt: string;
  };
  assignment: {
    assignedAt: string;
  };
};

type ClientWorkspaceResponse = Partial<ClientWorkspace> & {
  error?: string;
};

type TrainingPlan = {
  id: string;
  name: string;
  description: string | null;
  totalWeeks: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
};

type TrainingPlansResponse = {
  plans?: TrainingPlan[];
  error?: string;
};

type PageProps = {
  params: Promise<{
    clientMembershipId: string;
  }>;
};

function formatLabel(value: string | null) {
  if (!value) {
    return "Not provided";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

async function getClientWorkspace(
  gymId: string,
  clientMembershipId: string,
  requestHeaders: Headers
): Promise<ClientWorkspaceResponse> {
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? "http";
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  const baseUrl = configuredUrl
    ? configuredUrl.replace(/\/$/, "")
    : host
      ? `${protocol}://${host}`
      : null;

  if (!baseUrl) {
    return { error: "Unable to connect to the client workspace service" };
  }

  try {
    const response = await fetch(
      `${baseUrl}/api/gyms/${encodeURIComponent(gymId)}/trainer-clients/${encodeURIComponent(clientMembershipId)}`,
      {
        headers: {
          cookie: requestHeaders.get("cookie") ?? "",
        },
        cache: "no-store",
      }
    );

    const data = (await response.json()) as ClientWorkspaceResponse;

    if (!response.ok) {
      return {
        error:
          response.status === 403 || response.status === 404
            ? "You are not authorized to view this client."
            : data.error ?? "Unable to load client workspace",
      };
    }

    return data;
  } catch {
    return { error: "Unable to load client workspace" };
  }
}

async function getClientTrainingPlans(
  gymId: string,
  clientMembershipId: string,
  requestHeaders: Headers
): Promise<TrainingPlansResponse> {
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? "http";
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  const baseUrl = configuredUrl
    ? configuredUrl.replace(/\/$/, "")
    : host
      ? `${protocol}://${host}`
      : null;

  if (!baseUrl) {
    return { error: "Unable to connect to the training plans service" };
  }

  try {
    const response = await fetch(
      `${baseUrl}/api/gyms/${encodeURIComponent(gymId)}/trainer-clients/${encodeURIComponent(clientMembershipId)}/training-plans`,
      {
        headers: {
          cookie: requestHeaders.get("cookie") ?? "",
        },
        cache: "no-store",
      }
    );

    const data = (await response.json()) as TrainingPlansResponse;

    if (!response.ok) {
      return {
        error:
          response.status === 403 || response.status === 404
            ? "You are not authorized to view this client's workout program."
            : data.error ?? "Unable to load workout program",
      };
    }

    return data;
  } catch {
    return { error: "Unable to load workout program" };
  }
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export default async function ClientWorkspacePage({
  params,
}: PageProps) {
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

  const { clientMembershipId } = await params;
  const response = membership
    ? await getClientWorkspace(
        membership.gymId,
        clientMembershipId,
        requestHeaders
      )
    : { error: "You do not have an active trainer membership." };
  const trainingPlansResponse = membership
    ? await getClientTrainingPlans(
        membership.gymId,
        clientMembershipId,
        requestHeaders
      )
    : { error: "You do not have an active trainer membership." };

  return (
    <div className="space-y-6 py-2">
      <Link
        href="/trainer"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-green-700"
      >
        <ArrowLeft size={17} />
        Back to Trainer Dashboard
      </Link>

      {response.error || !response.client || !response.membership || !response.assignment ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
          <h1 className="text-lg font-semibold">Unable to open client workspace</h1>
          <p className="mt-1 text-sm">
            {response.error ?? "This client workspace is unavailable."}
          </p>
        </section>
      ) : (
        <>
          <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  <UserRound size={26} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-wide text-green-600">
                    Client Workspace
                  </p>
                  <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">
                    {response.client.name}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    @{response.client.username ?? "username unavailable"}
                  </p>
                </div>
              </div>

              <span className="w-fit rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                {formatLabel(response.membership.status)} membership
              </span>
            </div>

            <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
              {response.client.email ? (
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <Mail className="shrink-0 text-slate-400" size={17} />
                  <span className="break-all">{response.client.email}</span>
                </div>
              ) : null}
              {response.client.phoneNumber ? (
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <Phone className="shrink-0 text-slate-400" size={17} />
                  <span>{response.client.phoneNumber}</span>
                </div>
              ) : null}
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Personal Details</h2>
              <dl className="mt-3">
                <DetailItem
                  label="Age"
                  value={response.client.age !== null ? `${response.client.age} years` : "Not provided"}
                />
                <DetailItem
                  label="Height"
                  value={response.client.height !== null ? `${response.client.height} cm` : "Not provided"}
                />
                <DetailItem
                  label="Current weight"
                  value={response.client.weight !== null ? `${response.client.weight} kg` : "Not provided"}
                />
                <DetailItem
                  label="Target weight"
                  value={response.client.targetWeight !== null ? `${response.client.targetWeight} kg` : "Not provided"}
                />
                <DetailItem
                  label="Fitness goal"
                  value={formatLabel(response.client.fitnessGoal)}
                />
              </dl>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Training Profile</h2>
              <dl className="mt-3">
                <DetailItem
                  label="Training experience"
                  value={formatLabel(response.client.trainingExperience)}
                />
                <DetailItem
                  label="Activity level"
                  value={formatLabel(response.client.activityLevel)}
                />
                <DetailItem
                  label="Preferred training days"
                  value={response.client.preferredTrainingDays !== null ? `${response.client.preferredTrainingDays} days per week` : "Not provided"}
                />
              </dl>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="text-lg font-bold text-slate-900">Gym Membership</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CalendarDays className="mt-0.5 shrink-0 text-slate-400" size={17} />
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Joined
                    </span>
                    <span className="mt-1 block font-medium text-slate-900">
                      {formatDate(response.membership.joinedAt)}
                    </span>
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CalendarDays className="mt-0.5 shrink-0 text-slate-400" size={17} />
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Trainer assignment
                    </span>
                    <span className="mt-1 block font-medium text-slate-900">
                      {formatDate(response.assignment.assignedAt)}
                    </span>
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Workout Program</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Existing training plans for this client.
                  </p>
                </div>
              </div>

              {trainingPlansResponse.error ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  {trainingPlansResponse.error}
                </p>
              ) : trainingPlansResponse.plans?.length ? (
                <div className="mt-4 space-y-3">
                  {trainingPlansResponse.plans.map((plan) => (
                    <article
                      key={plan.id}
                      className="rounded-lg border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                          {plan.description ? (
                            <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
                          ) : null}
                        </div>
                        {plan.isActive ? (
                          <span className="w-fit rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                            Active
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-3 text-sm text-slate-600">
                        <span>{plan.totalWeeks} weeks</span>
                        {plan.startDate ? (
                          <span>Starts {formatDate(plan.startDate)}</span>
                        ) : null}
                        {plan.endDate ? (
                          <span>Ends {formatDate(plan.endDate)}</span>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-medium text-slate-600">
                  No workout program assigned yet.
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
