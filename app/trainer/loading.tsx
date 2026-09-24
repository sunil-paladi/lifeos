export default function TrainerLoading() {
  return (
    <div className="space-y-6 py-2" aria-busy="true">
      <div className="space-y-3">
        <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-9 w-64 animate-pulse rounded bg-slate-200" />
        <div className="h-5 w-80 max-w-full animate-pulse rounded bg-slate-200" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
      </div>
      <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}