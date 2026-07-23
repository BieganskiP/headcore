import type { ReactNode } from 'react';
import type { GuiState } from '../lib/types';
import type { View } from '../lib/router';
import { Badge } from '../components/Badge';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ViewDoc({ name, view, navigate, children }: {
  name: string;
  view: View;
  navigate: (v: View) => void;
  children: ReactNode;
}) {
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => navigate(view)}
        title={`Open ${name}`}
        className="font-medium text-sky-600 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-sky-400"
      >
        {name}
      </button>
      <p className="text-sm text-slate-600 dark:text-slate-400">{children}</p>
    </div>
  );
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-slate-200 bg-slate-100 px-1 font-mono text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
      {children}
    </kbd>
  );
}

const CODE_BLOCK = 'overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300';

export function DocsView({ state, navigate }: { state: GuiState; navigate: (v: View) => void }) {
  const linksConfigured = state.links?.editUrlTemplate !== undefined || state.links?.siteBaseUrl !== undefined;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold">Docs</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        headcore gui is a local, read-only analytical dashboard for your Sitecore site. Everything you
        see is fetched from Experience Edge (published content only) and stays on your machine — the
        server binds to 127.0.0.1 and never writes to Sitecore.
      </p>

      <Section title="Getting around">
        <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
          <li><Key>Ctrl</Key> <Key>K</Key> opens the command palette: jump to any route, component, or dictionary key, or run a full-text content search from the bottom row.</li>
          <li>The header has Refresh (refetches from Edge; the box next to it switches language, e.g. <code>da</code>), a theme toggle, and Export (the full dashboard state as JSON).</li>
          <li>Every screen is hash-addressable (<code>#/inspector?route=/about</code>, <code>#/localization?langs=da,de</code>, …) — the address bar is always a shareable deep link.</li>
          <li>Table views offer CSV export of whatever is currently filtered.</li>
        </ul>
      </Section>

      <Section title="Views">
        <ViewDoc name="Overview" view={{ view: 'overview' }} navigate={navigate}>
          Site health at a glance: route/component/rendering/dictionary counts, what changed since the
          previous fetch, content freshness buckets (clickable), and the heaviest routes.
        </ViewDoc>
        <ViewDoc name="Routes" view={{ view: 'routes' }} navigate={navigate}>
          Every route on the site as a tree and a table, with last-updated dates and a freshness filter.
        </ViewDoc>
        <ViewDoc name="Components" view={{ view: 'components' }} navigate={navigate}>
          Which components are used on how many pages, and which registry components are unused. A
          component&apos;s detail page shows every rendering instance with its field values, placeholders,
          and per-field fill rates (&quot;Subtitle is empty on 9 of 12 Heroes&quot;).
        </ViewDoc>
        <ViewDoc name="Graph" view={{ view: 'graph' }} navigate={navigate}>
          How components nest inside each other&apos;s placeholders across the whole site — columns are
          nesting depth, edge thickness is how often the containment occurs.
        </ViewDoc>
        <ViewDoc name="Matrix" view={{ view: 'matrix' }} navigate={navigate}>
          Routes × components dot grid — spot which pages share a composition and which are outliers.
        </ViewDoc>
        <ViewDoc name="Datasources" view={{ view: 'datasources' }} navigate={navigate}>
          Content items referenced as datasources, grouped by item. A datasource used on several routes
          is a blast radius: editing that one item changes all of those pages.
        </ViewDoc>
        <ViewDoc name="Links" view={{ view: 'links' }} navigate={navigate}>
          Internal links extracted from rich text and link fields: broken links (target is not a route),
          orphan pages (no other page links to them), and a click-depth graph from the home page.
          Locale-prefixed hrefs like <code>/en/…</code> are resolved against the language-neutral route
          paths, so language switchers are not flagged as broken.
        </ViewDoc>
        <ViewDoc name="Languages" view={{ view: 'localization' }} navigate={navigate}>
          Localization coverage matrix: compare the current language ({state.language}) against any
          other site languages — per route, is the translation present, missing, or older than the
          baseline version (stale)?
        </ViewDoc>
        <ViewDoc name="Content" view={{ view: 'content' }} navigate={navigate}>
          Full-text search across every field value on every page — &quot;where is this sentence
          used?&quot; — with the component, field, and placeholder path of each hit.
        </ViewDoc>
        <ViewDoc name="Inspector" view={{ view: 'inspector' }} navigate={navigate}>
          The rendering/placeholder tree of a single route with expandable field values — the layout
          JSON, made readable.
        </ViewDoc>
        <ViewDoc name="Dictionary" view={{ view: 'dictionary' }} navigate={navigate}>
          All dictionary keys and phrases, filterable, with one-click key copy and a side-by-side
          comparison against a second language.
        </ViewDoc>
        <ViewDoc name="Audit" view={{ view: 'audit' }} navigate={navigate}>
          Content-quality findings: empty field values, images without alt text, renderings with no
          datasource or content, and page-level SEO checks — missing page title, missing meta
          description, duplicate titles (on routes that expose route fields).
        </ViewDoc>
        <ViewDoc name="History" view={{ view: 'history' }} navigate={navigate}>
          Every distinct fetch is stored as a snapshot in <code>.headcore/history/</code> next to your
          config (identical fetches recorded once, newest 100 kept). Trend sparklines over time, plus a
          diff between any two snapshots.
        </ViewDoc>
      </Section>

      <Section title="Deep links into editing">
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
          With an optional <code>gui</code> section in <code>headcore.config.ts</code>, routes get
          &quot;editor ↗&quot; and &quot;live ↗&quot; links (Inspector and Routes):
        </p>
        <pre className={CODE_BLOCK}>{`gui: {
  // {itemId}, {lang}, {site}, {routePath} are substituted per route.
  editUrlTemplate: 'https://pages.sitecorecloud.io/?sc_itemid={itemId}&sc_lang={lang}&sc_site={site}',
  siteBaseUrl: 'https://www.example.com',
},`}</pre>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Current config: {linksConfigured
            ? <Badge tone="green">deep links configured</Badge>
            : <Badge tone="slate">not configured</Badge>}
        </p>
      </Section>

      <Section title="API">
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
          The same endpoints the dashboard uses are available for scripting on this port:
        </p>
        <table className="w-full text-left text-sm">
          <tbody>
            {[
              ['GET /api/state', 'the cached dashboard state'],
              ['POST /api/refresh { lang? }', 'refetch from Edge (optionally switching language)'],
              ['GET /api/dictionary?lang=xx', 'dictionary for another language (read-only)'],
              ['GET /api/routes?lang=xx', 'route list for another language (read-only)'],
              ['GET /api/history', 'stored snapshot summaries'],
              ['GET /api/history/:id', 'one full stored snapshot'],
            ].map(([endpoint, what]) => (
              <tr key={endpoint} className="border-b border-slate-100 dark:border-slate-900">
                <td className="whitespace-nowrap py-1.5 pr-4 font-mono text-xs">{endpoint}</td>
                <td className="py-1.5 text-slate-600 dark:text-slate-400">{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Launching">
        <pre className={CODE_BLOCK}>{`headcore gui [--lang <lang>] [--port <n>] [--no-open]`}</pre>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Default port 4646 (the next free port is tried automatically). The browser opens immediately
          while the first Edge fetch runs in the background. Add{' '}
          <code>&quot;headcore:gui&quot;: &quot;headcore gui&quot;</code> to your project&apos;s npm
          scripts for quick access, and <code>.headcore/</code> to <code>.gitignore</code> if you do not
          want snapshots committed.
        </p>
      </Section>
    </div>
  );
}
