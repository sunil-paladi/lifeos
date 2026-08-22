import Journal from "@/app/components/journal/Journal";

export default function JournalPage() {
  return (
    <main className="w-full space-y-5">

      {/* Page Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-green-600">
          Journal
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Your Daily Journal
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Reflect on your day, record your achievements and keep learning.
        </p>
      </div>

      {/* Journal */}
      <Journal />

    </main>
  );
}