export default function Loading() {
  return (
    <div className="space-y-6 py-2" aria-busy="true">
      <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-40 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
        <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
