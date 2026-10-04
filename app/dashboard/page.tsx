import { headers } from "next/headers";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CheckSquare,
  ClipboardCheck,
  Droplets,
  Dumbbell,
  Salad,
} from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";

const dailyActions = [
  {
    title: "Workout",
    description: "Plan a session or pick up where you left off.",
    href: "/workout",
    icon: Dumbbell,
    accent: "bg-primary/10 text-primary",
  },
  {
    title: "Nutrition",
    description: "Log a meal and keep your daily goals in view.",
    href: "/nutrition",
    icon: Salad,
    accent: "bg-secondary/20 text-orange-700",
  },
  {
    title: "Attendance",
    description: "Check in for your gym visit or review attendance.",
    href: "/attendance",
    icon: ClipboardCheck,
    accent: "bg-primary/10 text-primary",
  },
  {
    title: "Habits",
    description: "Build consistency one small action at a time.",
    href: "/habits",
    icon: CheckSquare,
    accent: "bg-orange-50 text-orange-700",
  },
  {
    title: "Water",
    description: "Track your hydration throughout the day.",
    href: "/water",
    icon: Droplets,
    accent: "bg-sky-50 text-sky-700",
  },
  {
    title: "Journal",
    description: "Capture a thought, reflection, or daily win.",
    href: "/journal",
    icon: BookOpen,
    accent: "bg-slate-100 text-slate-700",
  },
];

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const firstName = session.user.name.trim().split(/\s+/)[0] || "there";
  const today = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-8 py-2">
      <Card className="relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-secondary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-1/3 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge
              variant="secondary"
              className="border-sky-200 bg-sky-100 text-sky-700 [html[data-theme=dark]_&]:border-sky-500/20 [html[data-theme=dark]_&]:bg-sky-500/10 [html[data-theme=dark]_&]:text-sky-300 [@media(prefers-color-scheme:dark)]:[html[data-theme=system]_&]:border-sky-500/20 [@media(prefers-color-scheme:dark)]:[html[data-theme=system]_&]:bg-sky-500/10 [@media(prefers-color-scheme:dark)]:[html[data-theme=system]_&]:text-sky-300"
            >
              {today}
            </Badge>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Let&apos;s make today count, {firstName}.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              A little progress in the areas that matter adds up. Choose one
              place to start.
            </p>
          </div>

          <Button asChild size="lg" className="shrink-0 rounded-xl">
            <Link href="/workout">
              <Dumbbell size={17} />
              Go to workout
              <ArrowUpRight size={16} />
            </Link>
          </Button>
        </div>
      </Card>

      <section aria-labelledby="daily-actions-heading">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Your everyday toolkit
          </p>
          <h2
            id="daily-actions-heading"
            className="mt-1 text-xl font-bold tracking-tight text-foreground"
          >
            Where would you like to begin?
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {dailyActions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.title}
                href={action.href}
                className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card className="flex min-h-36 items-start gap-4 p-5 transition group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${action.accent}`}
                  >
                    <Icon size={21} strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        {action.title}
                      </span>
                      <ArrowUpRight
                        size={16}
                        className="shrink-0 text-muted-foreground transition group-hover:text-primary"
                      />
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
