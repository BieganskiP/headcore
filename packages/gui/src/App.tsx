import { useCallback, useEffect, useState } from 'react';
import { fetchState, refreshState, type ApiResult } from './lib/api';
import type { GuiState } from './lib/types';
import { useHashView, type View } from './lib/router';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ErrorPanel } from './components/ErrorPanel';
import { LoadingPanel } from './components/LoadingPanel';
import { Overview } from './views/Overview';
import { RoutesView } from './views/RoutesView';
import { ComponentsView } from './views/ComponentsView';
import { InspectorView } from './views/InspectorView';
import { DictionaryView } from './views/DictionaryView';

export function App() {
  const [state, setState] = useState<GuiState | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useHashView();

  const apply = useCallback((result: ApiResult) => {
    if (result.ok) {
      setState(result.state);
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
    <div className="flex h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar view={view} onNavigate={setView} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header state={state} busy={busy} warnings={errors} onRefresh={(lang) => void onRefresh(lang)} />
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          {state === null
            ? loading
              ? <LoadingPanel />
              : <ErrorPanel errors={errors} busy={busy} onRetry={() => void onRefresh()} />
            : renderView(view, state, setView)}
        </main>
      </div>
    </div>
  );
}

function renderView(view: View, state: GuiState, navigate: (v: View) => void) {
  switch (view.view) {
    case 'routes': return <RoutesView state={state} navigate={navigate} />;
    case 'components': return <ComponentsView state={state} selected={view.component} navigate={navigate} />;
    case 'inspector': return <InspectorView state={state} route={view.route} navigate={navigate} />;
    case 'dictionary': return <DictionaryView state={state} />;
    default: return <Overview state={state} navigate={navigate} />;
  }
}
