export function LoadingPanel() {
  return (
    <div className="mx-auto mt-24 flex max-w-sm flex-col items-center gap-3 text-center">
      <div
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500 dark:border-slate-700 dark:border-t-sky-400"
      />
      <p className="text-sm font-medium" role="status">Fetching site data from Edge…</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        First load pulls every route and its layout; this can take a moment on large sites.
      </p>
    </div>
  );
}
