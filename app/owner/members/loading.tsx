export default function Loading() {
  return (
    <div className="space-y-6 py-2" aria-busy="true">
      <div>
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-9 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-5 space-y-4">
          <div className="h-16 animate-pulse rounded bg-slate-100" />
          <div className="h-16 animate-pulse rounded bg-slate-100" />
          <div className="h-16 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}