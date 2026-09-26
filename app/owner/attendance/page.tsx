import { redirect } from "next/navigation";
import AttendanceView from "@/app/components/attendance/AttendanceView";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { getAttendanceMembershipOptions } from "@/app/lib/attendance";

export default async function OwnerAttendancePage() {
  const { user } = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const memberships = await getAttendanceMembershipOptions(user.id, "OWNER");

  if (memberships.length === 0) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <h1 className="font-semibold">Gym attendance unavailable</h1>
        <p className="mt-1 text-sm">You do not have an active owner membership.</p>
      </section>
    );
  }

  return <AttendanceView role="OWNER" memberships={memberships} />;
}