export function ErrorPanel({ errors, busy, onRetry }: { errors: string[]; busy: boolean; onRetry: () => void }) {
  if (errors.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>;
  }
  return (
    <div className="mx-auto mt-16 max-w-lg rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40">
      <h2 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-300">Could not fetch site data</h2>
      <ul className="mb-4 list-inside list-disc text-sm text-red-700 dark:text-red-400">
        {errors.map((e) => <li key={e}>{e}</li>)}
      </ul>
      <button
        onClick={onRetry}
        disabled={busy}
        className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
      >
        {busy ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  );
}
