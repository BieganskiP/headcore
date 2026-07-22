import { useCallback, useEffect, useState } from 'react';
import { FRESH_KEYS, type FreshKey } from './analytics';

export type View =
  | { view: 'overview' }
  | { view: 'routes'; fresh?: FreshKey }
  | { view: 'components'; component?: string }
  | { view: 'graph' }
  | { view: 'matrix' }
  | { view: 'datasources'; ds?: string }
  | { view: 'links' }
  | { view: 'localization'; langs?: string }
  | { view: 'content'; q?: string }
  | { view: 'audit' }
  | { view: 'inspector'; route?: string }
  | { view: 'dictionary'; q?: string }
  | { view: 'history' };

export function parseHash(hash: string): View {
  const stripped = hash.replace(/^#\/?/, '');
  const qIdx = stripped.indexOf('?');
  const path = qIdx === -1 ? stripped : stripped.slice(0, qIdx);
  const query = qIdx === -1 ? '' : stripped.slice(qIdx + 1);
  const params = new URLSearchParams(query);
  if (path === 'routes') {
    const fresh = params.get('fresh');
    return fresh !== null && (FRESH_KEYS as string[]).includes(fresh)
      ? { view: 'routes', fresh: fresh as FreshKey }
      : { view: 'routes' };
  }
  if (path === 'components' || path.startsWith('components/')) {
    const sub = path.startsWith('components/') ? decodeURIComponent(path.slice('components/'.length)) : '';
    // The query form is the pre-subpage deep-link format; keep it working.
    const component = sub || params.get('component');
    return component ? { view: 'components', component } : { view: 'components' };
  }
  if (path === 'graph') return { view: 'graph' };
  if (path === 'matrix') return { view: 'matrix' };
  if (path === 'datasources') {
    const ds = params.get('ds');
    return ds ? { view: 'datasources', ds } : { view: 'datasources' };
  }
  if (path === 'links') return { view: 'links' };
  if (path === 'localization') {
    const langs = params.get('langs');
    return langs ? { view: 'localization', langs } : { view: 'localization' };
  }
  if (path === 'content') {
    const q = params.get('q');
    return q ? { view: 'content', q } : { view: 'content' };
  }
  if (path === 'history') return { view: 'history' };
  if (path === 'audit') return { view: 'audit' };
  if (path === 'inspector') {
    const route = params.get('route');
    return route ? { view: 'inspector', route } : { view: 'inspector' };
  }
  if (path === 'dictionary') {
    const q = params.get('q');
    return q ? { view: 'dictionary', q } : { view: 'dictionary' };
  }
  return { view: 'overview' };
}

export function toHash(v: View): string {
  if (v.view === 'routes' && v.fresh !== undefined) {
    return `#/routes?fresh=${v.fresh}`;
  }
  if (v.view === 'components' && v.component !== undefined) {
    return `#/components/${encodeURIComponent(v.component)}`;
  }
  if (v.view === 'inspector' && v.route !== undefined) {
    return `#/inspector?route=${encodeURIComponent(v.route)}`;
  }
  if (v.view === 'dictionary' && v.q !== undefined) {
    return `#/dictionary?q=${encodeURIComponent(v.q)}`;
  }
  if (v.view === 'datasources' && v.ds !== undefined) {
    return `#/datasources?ds=${encodeURIComponent(v.ds)}`;
  }
  if (v.view === 'localization' && v.langs !== undefined) {
    return `#/localization?langs=${encodeURIComponent(v.langs)}`;
  }
  if (v.view === 'content' && v.q !== undefined) {
    return `#/content?q=${encodeURIComponent(v.q)}`;
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
