import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";
import AssignTrainerForm from "./AssignTrainerForm";
import CreateClientForm from "./CreateClientForm";

type GymMember = {
  id: string;
  userId: string;
  name: string;
  username: string | null;
  email: string | null;
  role: "OWNER" | "TRAINER" | "MEMBER";
  status: string;
  joinedAt: string;
};

type Trainer = {
  membershipId: string;
  name: string;
  username: string | null;
};

type AssignedTrainer = {
  name: string;
  username: string | null;
};

type MembersResponse = {
  memberships?: GymMember[];
  error?: string;
};

type TrainersResponse = {
  trainers?: Trainer[];
  error?: string;
};

type AssignmentsResponse = {
  clients?: Array<{
    clientMembershipId: string;
    trainer: AssignedTrainer;
  }>;
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

function roleClassName(role: GymMember["role"]) {
  if (role === "OWNER") {
    return "bg-amber-50 text-amber-700";
  }

  if (role === "TRAINER") {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-slate-100 text-slate-700";
}

async function getMembers(
  gymId: string,
  requestHeaders: Headers
): Promise<MembersResponse> {
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
    return { error: "Unable to connect to the members service" };
  }

  try {
    const response = await fetch(
      `${baseUrl}/api/gyms/${encodeURIComponent(gymId)}/members`,
      {
        headers: {
          cookie: requestHeaders.get("cookie") ?? "",
        },
        cache: "no-store",
      }
    );

    const data = (await response.json()) as MembersResponse;

    if (!response.ok) {
      return {
        error:
          response.status === 401 || response.status === 403
            ? "You are not authorized to view gym members."
            : data.error ?? "Unable to load gym members",
      };
    }

    return data;
  } catch {
    return { error: "Unable to load gym members" };
  }
}

async function getTrainers(
  gymId: string,
  requestHeaders: Headers
): Promise<TrainersResponse> {
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  const baseUrl = configuredUrl
    ? configuredUrl.replace(/\/$/, "")
    : host
      ? `${protocol}://${host}`
      : null;

  if (!baseUrl) {
    return { error: "Unable to connect to the trainers service" };
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
      : { error: data.error ?? "Unable to load active trainers" };
  } catch {
    return { error: "Unable to load active trainers" };
  }
}

async function getAssignments(
  gymId: string,
  requestHeaders: Headers
): Promise<AssignmentsResponse> {
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  const baseUrl = configuredUrl
    ? configuredUrl.replace(/\/$/, "")
    : host
      ? `${protocol}://${host}`
      : null;

  if (!baseUrl) {
    return { error: "Unable to connect to the assignments service" };
  }

  try {
    const response = await fetch(
      `${baseUrl}/api/gyms/${encodeURIComponent(gymId)}/trainer-clients`,
      {
        headers: { cookie: requestHeaders.get("cookie") ?? "" },
        cache: "no-store",
      }
    );
    const data = (await response.json()) as AssignmentsResponse;

    return response.ok
      ? data
      : { error: data.error ?? "Unable to load trainer assignments" };
  } catch {
    return { error: "Unable to load trainer assignments" };
  }
}

export default async function OwnerMembersPage() {
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
      role: "OWNER",
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
    ? await getMembers(membership.gymId, requestHeaders)
    : { error: "You do not have an active owner membership." };
  const trainersResponse = membership
    ? await getTrainers(membership.gymId, requestHeaders)
    : { error: "You do not have an active owner membership." };
  const assignmentsResponse = membership
    ? await getAssignments(membership.gymId, requestHeaders)
    : { error: "You do not have an active owner membership." };
  const members = response.memberships ?? [];
  const trainers = trainersResponse.trainers ?? [];
  const assignments = new Map(
    (assignmentsResponse.clients ?? []).map((assignment) => [
      assignment.clientMembershipId,
      assignment.trainer,
    ])
  );

  return (
    <div className="space-y-6 py-2">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-green-600">
          Gym management
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Members
        </h1>
        <p className="mt-2 text-slate-600">
          View the people connected to your active gym.
        </p>
      </header>

      {membership ? <CreateClientForm gymId={membership.gymId} /> : null}

      {response.error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
          <h2 className="font-semibold">Unable to load members</h2>
          <p className="mt-1 text-sm">{response.error}</p>
        </section>
      ) : members.length === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-medium text-slate-700">No gym members yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Members will appear here when they join this gym.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="font-bold text-slate-900">Gym members</h2>
            <p className="mt-1 text-sm text-slate-500">
              {members.length} member{members.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {members.map((member) => (
              <article
                key={member.id}
                className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] sm:items-center sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {member.name}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {member.username ? `@${member.username}` : "Username unavailable"}
                  </p>
                </div>

                <p className="truncate text-sm text-slate-600">
                  {member.email ?? "Email unavailable"}
                </p>

                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${roleClassName(member.role)}`}
                >
                  {formatLabel(member.role)}
                </span>

                <div className="text-sm text-slate-500 sm:text-right">
                  <p className="font-medium text-slate-700">
                    {formatLabel(member.status)}
                  </p>
                  <p className="mt-1 text-xs">
                    Joined {formatDate(member.joinedAt)}
                  </p>
                </div>
                {member.role === "MEMBER" && membership ? (
                  <AssignTrainerForm
                    gymId={membership.gymId}
                    clientMembershipId={member.id}
                    trainers={trainers}
                    currentTrainer={assignments.get(member.id)}
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