import { useMemo } from 'react';
import type { GuiState, GuiLayoutNode } from '../lib/types';
import type { View } from '../lib/router';
import { componentInstances, type RouteInstances } from '../lib/analytics';
import { Badge } from '../components/Badge';
import { FieldsTable } from '../components/FieldsTable';

function childSummary(nodes: GuiLayoutNode[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const n of nodes) counts.set(n.componentName, (counts.get(n.componentName) ?? 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}

function InstancePlaceholders({ placeholders, navigate }: { placeholders: Record<string, GuiLayoutNode[]>; navigate: (v: View) => void }) {
  const entries = Object.entries(placeholders);
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {entries.map(([key, nodes]) => (
        <div key={key} className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 dark:text-slate-500">placeholder</span>
          <Badge tone="slate">{key}</Badge>
          {nodes.length === 0
            ? <span className="italic text-slate-400 dark:text-slate-500">empty</span>
            : childSummary(nodes).map(({ name, count }) => (
                <button
                  key={name}
                  type="button"
                  className="focus-visible:ring-2 focus-visible:ring-sky-400"
                  onClick={() => navigate({ view: 'components', component: name })}
                  title={`Show usage of ${name}`}
                >
                  <Badge>{count > 1 ? `${name} ×${count}` : name}</Badge>
                </button>
              ))}
        </div>
      ))}
    </div>
  );
}

function RouteSection({ entry, navigate }: { entry: RouteInstances; navigate: (v: View) => void }) {
  const { route, instances } = entry;
  return (
    <section className="mb-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-2 flex flex-wrap items-baseline gap-2">
        <button
          type="button"
          className="font-medium text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
          onClick={() => navigate({ view: 'inspector', route: route.routePath })}
          title={`Inspect ${route.routePath}`}
        >
          <code>{route.routePath}</code>
        </button>
        {route.name && <span className="text-sm text-slate-500 dark:text-slate-400">{route.name}</span>}
        {route.updatedAt && <span className="text-xs text-slate-400 dark:text-slate-500">updated {route.updatedAt}</span>}
        {instances.length > 1 && <Badge tone="slate">{instances.length} renderings</Badge>}
      </div>
      {instances.map((inst) => (
        <div key={inst.path} className="mt-3 first:mt-0">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Badge tone="slate">{inst.path}</Badge>
            {inst.node.dataSource
              ? <code title="dataSource">{inst.node.dataSource}</code>
              : <span className="italic">no datasource</span>}
          </div>
          <FieldsTable fields={inst.node.fields} />
          <InstancePlaceholders placeholders={inst.node.placeholders} navigate={navigate} />
        </div>
      ))}
    </section>
  );
}

export function ComponentDetailView({ state, component, navigate }: { state: GuiState; component: string; navigate: (v: View) => void }) {
  const perRoute = useMemo(() => componentInstances(state.routes, component), [state.routes, component]);
  const registryEntry = useMemo(
    () => state.registry.find((r) => r.componentName === component),
    [state.registry, component],
  );
  const renderingCount = perRoute.reduce((acc, e) => acc + e.instances.length, 0);

  return (
    <div className="max-w-4xl">
      <button
        type="button"
        className="mb-4 text-sm text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
        onClick={() => navigate({ view: 'components' })}
      >
        ← All components
      </button>

      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-semibold">{component}</h1>
        {registryEntry && <Badge tone="green">registry</Badge>}
      </div>
      {registryEntry && (
        <p className="mb-1 text-sm text-slate-600 dark:text-slate-400">
          {registryEntry.description}
          {registryEntry.placement && <span className="text-slate-400 dark:text-slate-500"> · placement: {registryEntry.placement}</span>}
        </p>
      )}
      {registryEntry && registryEntry.placeholders.length > 0 && (
        <p className="mb-1 text-sm text-slate-600 dark:text-slate-400">
          Exposes placeholder{registryEntry.placeholders.length === 1 ? '' : 's'}:{' '}
          {registryEntry.placeholders.map((p, i) => (
            <span key={p.key}>
              {i > 0 && ', '}
              <code>{p.key}</code>
              {p.dynamic && <span className="text-slate-400 dark:text-slate-500"> (dynamic)</span>}
              <span className="text-slate-400 dark:text-slate-500"> → {p.allowedRenderings.join(', ')}</span>
            </span>
          ))}
        </p>
      )}
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        {perRoute.length === 0
          ? `Not rendered on any of the ${state.routes.length} routes of ${state.site} (${state.language}).`
          : `${renderingCount} rendering${renderingCount === 1 ? '' : 's'} on ${perRoute.length} of ${state.routes.length} routes of ${state.site} (${state.language}).`}
      </p>

      {perRoute.length === 0 && !registryEntry && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          No component named <code>{component}</code> in the current data.
        </p>
      )}

      {perRoute.map((entry) => <RouteSection key={entry.route.routePath} entry={entry} navigate={navigate} />)}
    </div>
  );
}
