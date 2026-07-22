import type { GuiLayoutNode } from '../lib/types';

/** Layout JSON wraps most field values in `{ value: … }`; unwrap for the one-line preview. */
function unwrap(value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec);
    if (keys.length === 1 && keys[0] === 'value') return rec.value;
  }
  return value;
}

const PREVIEW_MAX = 120;

export function previewText(value: unknown): string {
  const v = unwrap(value);
  if (v === null || v === undefined || v === '') return '—';
  const text = typeof v === 'string' ? v : JSON.stringify(v);
  return text.length > PREVIEW_MAX ? text.slice(0, PREVIEW_MAX - 1) + '…' : text;
}

function FieldRow({ name, value }: { name: string; value: unknown }) {
  return (
    <details className="group border-b border-slate-100 py-1 last:border-b-0 dark:border-slate-900">
      <summary className="flex cursor-pointer items-baseline gap-2 text-sm focus-visible:ring-2 focus-visible:ring-sky-400">
        <span aria-hidden="true" className="text-slate-400 group-open:rotate-90">▸</span>
        <code className="shrink-0 font-medium">{name}</code>
        <span className="truncate text-slate-500 dark:text-slate-400">{previewText(value)}</span>
      </summary>
      <pre className="mt-1 overflow-x-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-900">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

export function FieldsTable({ fields }: { fields: GuiLayoutNode['fields'] }) {
  const entries = Object.entries(fields);
  if (entries.length === 0) {
    return <p className="text-xs text-slate-400 dark:text-slate-500">No fields on this rendering.</p>;
  }
  return (
    <div>
      {entries.map(([name, value]) => <FieldRow key={name} name={name} value={value} />)}
    </div>
  );
}
