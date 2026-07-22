import { useCallback, useEffect, useState } from 'react';
import { fetchState, refreshState, type ApiResult } from './lib/api';
import type { GuiState } from './lib/types';
import { useHashView, type View } from './lib/router';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ErrorPanel } from './components/ErrorPanel';
import { LoadingPanel } from './components/LoadingPanel';
import { CommandPalette } from './components/CommandPalette';
import { Overview } from './views/Overview';
import { RoutesView } from './views/RoutesView';
import { ComponentsView } from './views/ComponentsView';
import { GraphView } from './views/GraphView';
import { MatrixView } from './views/MatrixView';
import { DatasourcesView } from './views/DatasourcesView';
import { LinksView } from './views/LinksView';
import { LocalizationView } from './views/LocalizationView';
import { ContentSearchView } from './views/ContentSearchView';
import { AuditView } from './views/AuditView';
import { InspectorView } from './views/InspectorView';
import { DictionaryView } from './views/DictionaryView';
import { HistoryView } from './views/HistoryView';

interface Snapshot {
  state: GuiState | null;
  /** State from the fetch before the current one — powers the Overview diff. */
  prev: GuiState | null;
}

export function App() {
  const [snap, setSnap] = useState<Snapshot>({ state: null, prev: null });
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [view, setView] = useHashView();
  const state = snap.state;

  const apply = useCallback((result: ApiResult) => {
    if (result.ok) {
      setSnap((s) => ({
        state: result.state,
        prev: s.state !== null && s.state.fetchedAt !== result.state.fetchedAt ? s.state : s.prev,
      }));
      setErrors(result.state.errors ?? []);
      setLoading(false);
    } else {
      setErrors(result.errors);
      setLoading(result.loading === true);
    }
  }, []);

  // No abort/ignore guard: App is the root and never unmounts. If this fetch
  // pattern moves into a view that mounts/unmounts, add an active-flag cleanup.
  useEffect(() => {
    fetchState().then(apply).catch((err: unknown) => { setErrors([String(err)]); setLoading(false); });
  }, [apply]);

  // The CLI serves the app before its initial Edge fetch finishes; poll until
  // the data lands (or the fetch fails and loading turns off).
  useEffect(() => {
    if (!loading || state !== null) return;
    const timer = window.setInterval(() => {
      fetchState().then(apply).catch((err: unknown) => { setErrors([String(err)]); setLoading(false); });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loading, state, apply]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onRefresh = useCallback(async (lang?: string) => {
    setBusy(true);
    try {
      apply(await refreshState(lang));
    } catch (err) {
      setErrors([String(err)]);
    } finally {
      setBusy(false);
    }
  }, [apply]);

  return (
    <div className="flex h-screen">
      <Sidebar view={view} onNavigate={setView} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header state={state} busy={busy} warnings={errors} onRefresh={(lang) => void onRefresh(lang)} onOpenSearch={() => setPaletteOpen(true)} />
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          {state === null
            ? loading
              ? <LoadingPanel />
              : <ErrorPanel errors={errors} busy={busy} onRetry={() => void onRefresh()} />
            : (
              // Keyed by view name: switching views replays a single, quick
              // slide-up entrance; subpage changes within a view do not.
              <div key={view.view} className="animate-enter">
                {renderView(view, state, snap.prev, setView)}
              </div>
            )}
        </main>
      </div>
      {paletteOpen && state !== null && (
        <CommandPalette state={state} onClose={() => setPaletteOpen(false)} navigate={setView} />
      )}
    </div>
  );
}

function renderView(view: View, state: GuiState, prev: GuiState | null, navigate: (v: View) => void) {
  switch (view.view) {
    case 'routes': return <RoutesView state={state} fresh={view.fresh} navigate={navigate} />;
    case 'components': return <ComponentsView state={state} selected={view.component} navigate={navigate} />;
    case 'graph': return <GraphView state={state} navigate={navigate} />;
    case 'matrix': return <MatrixView state={state} navigate={navigate} />;
    // Keyed like the other param views: a ds deep link re-expands on hash change.
    case 'datasources': return <DatasourcesView key={view.ds ?? ''} state={state} ds={view.ds} navigate={navigate} />;
    case 'links': return <LinksView state={state} navigate={navigate} />;
    case 'localization': return <LocalizationView state={state} langs={view.langs} navigate={navigate} />;
    // Key remounts the view when a palette pick changes the deep-linked query.
    case 'content': return <ContentSearchView key={view.q ?? ''} state={state} q={view.q} navigate={navigate} />;
    case 'history': return <HistoryView state={state} navigate={navigate} />;
    case 'audit': return <AuditView state={state} navigate={navigate} />;
    case 'inspector': return <InspectorView state={state} route={view.route} navigate={navigate} />;
    // Key remounts the view when a palette pick changes the deep-linked filter.
    case 'dictionary': return <DictionaryView key={view.q ?? ''} state={state} initialFilter={view.q} />;
    default: return <Overview state={state} prev={prev} navigate={navigate} />;
  }
}
