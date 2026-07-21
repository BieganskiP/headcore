import type { View } from '../lib/router';

const ITEMS: Array<{ view: View['view']; label: string }> = [
  { view: 'overview', label: 'Overview' },
  { view: 'routes', label: 'Routes' },
  { view: 'components', label: 'Components' },
  { view: 'inspector', label: 'Inspector' },
];

export function Sidebar({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  return (
    <nav className="flex w-48 shrink-0 flex-col border-r border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 px-2 text-lg font-bold tracking-tight">
        head<span className="text-sky-600 dark:text-sky-400">core</span>
      </div>
      {ITEMS.map((item) => (
        <button
          key={item.view}
          onClick={() => onNavigate({ view: item.view } as View)}
          className={`mb-1 rounded px-2 py-1.5 text-left text-sm font-medium ${
            view.view === item.view
              ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300'
              : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
