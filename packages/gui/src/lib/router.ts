import { useCallback, useEffect, useState } from 'react';

export type View =
  | { view: 'overview' }
  | { view: 'routes' }
  | { view: 'components'; component?: string }
  | { view: 'inspector'; route?: string }
  | { view: 'dictionary' };

export function parseHash(hash: string): View {
  const stripped = hash.replace(/^#\/?/, '');
  const qIdx = stripped.indexOf('?');
  const path = qIdx === -1 ? stripped : stripped.slice(0, qIdx);
  const query = qIdx === -1 ? '' : stripped.slice(qIdx + 1);
  const params = new URLSearchParams(query);
  if (path === 'routes') return { view: 'routes' };
  if (path === 'components' || path.startsWith('components/')) {
    const sub = path.startsWith('components/') ? decodeURIComponent(path.slice('components/'.length)) : '';
    // The query form is the pre-subpage deep-link format; keep it working.
    const component = sub || params.get('component');
    return component ? { view: 'components', component } : { view: 'components' };
  }
  if (path === 'inspector') {
    const route = params.get('route');
    return route ? { view: 'inspector', route } : { view: 'inspector' };
  }
  if (path === 'dictionary') return { view: 'dictionary' };
  return { view: 'overview' };
}

export function toHash(v: View): string {
  if (v.view === 'components' && v.component !== undefined) {
    return `#/components/${encodeURIComponent(v.component)}`;
  }
  if (v.view === 'inspector' && v.route !== undefined) {
    return `#/inspector?route=${encodeURIComponent(v.route)}`;
  }
  return v.view === 'overview' ? '#/' : `#/${v.view}`;
}

/** Hash-backed view state: back button and deep links work without a router dependency. */
export function useHashView(): [View, (v: View) => void] {
  const [view, setView] = useState<View>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = (): void => setView(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = useCallback((v: View): void => {
    window.location.hash = toHash(v);
  }, []);
  return [view, navigate];
}
