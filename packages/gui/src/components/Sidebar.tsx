import type { View } from '../lib/router';

const ITEMS: Array<{ view: View['view']; label: string }> = [
  { view: 'overview', label: 'Overview' },
  { view: 'routes', label: 'Routes' },
  { view: 'components', label: 'Components' },
  { view: 'graph', label: 'Graph' },
  { view: 'matrix', label: 'Matrix' },
  { view: 'datasources', label: 'Datasources' },
  { view: 'links', label: 'Links' },
  { view: 'localization', label: 'Languages' },
  { view: 'content', label: 'Content' },
  { view: 'inspector', label: 'Inspector' },
  { view: 'dictionary', label: 'Dictionary' },
  { view: 'audit', label: 'Audit' },
  { view: 'history', label: 'History' },
  { view: 'docs', label: 'Docs' },
];

export function Sidebar({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  return (
    <nav className="flex w-52 shrink-0 flex-col border-r border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-6 px-2 font-mono text-lg font-semibold tracking-tight">
        head<span className="text-sky-600 dark:text-sky-400">core</span>
        <span aria-hidden="true" className="cursor-blink ml-0.5 text-sky-600 dark:text-sky-400">▌</span>
      </div>
      {ITEMS.map((item) => {
        const active = view.view === item.view;
        return (
          <button
            key={item.view}
            onClick={() => onNavigate({ view: item.view } as View)}
            aria-current={active ? 'page' : undefined}
            className={`relative mb-1 rounded-md px-3 py-1.5 text-left text-sm font-medium focus-visible:ring-2 focus-visible:ring-sky-400 ${
              active
                ? 'bg-sky-100/80 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200'
            }`}
          >
            {active && (
              <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-sky-500 dark:bg-sky-400" />
            )}
            {item.label}
          </button>
        );
      })}
      <div className="mt-auto px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-600">
        local · read-only
      </div>
    </nav>
  );
}
