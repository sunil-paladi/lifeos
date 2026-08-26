import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <main
      style={{
        maxWidth: "700px",
        margin: "60px auto",
        padding: "20px",
      }}
    >
      <h1>LifeOS Dashboard</h1>

      <p style={{ marginTop: "20px" }}>
        Welcome, {session.user.name}!
      </p>

      <p>
        Username: {session.user.username}
      </p>

      <p>
        You are logged in successfully.
      </p>
    </main>
  );
}