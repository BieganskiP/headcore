import { useEffect, useState } from 'react';

export type View =
  | { view: 'overview' }
  | { view: 'routes' }
  | { view: 'components'; component?: string }
  | { view: 'inspector'; route?: string };

export function parseHash(hash: string): View {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(query);
  if (path === 'routes') return { view: 'routes' };
  if (path === 'components') {
    const component = params.get('component');
    return component !== null ? { view: 'components', component } : { view: 'components' };
  }
  if (path === 'inspector') {
    const route = params.get('route');
    return route !== null ? { view: 'inspector', route } : { view: 'inspector' };
  }
  return { view: 'overview' };
}

export function toHash(v: View): string {
  if (v.view === 'components' && v.component !== undefined) {
    return `#/components?component=${encodeURIComponent(v.component)}`;
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
  return [view, (v) => { window.location.hash = toHash(v); }];
}
