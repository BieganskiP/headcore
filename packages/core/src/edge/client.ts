import type { EdgeConfig } from '../types.js';
import { LAYOUT_QUERY, DICTIONARY_QUERY, ROUTES_QUERY } from './query.js';

interface LayoutResponse {
  data?: { layout?: { item?: { rendered?: unknown } | null } };
  errors?: Array<{ message: string }>;
}

export interface DictionaryEntry {
  key: string;
  value: string;
}

interface DictionaryResponse {
  data?: {
    site?: {
      siteInfo?: {
        dictionary?: {
          results?: DictionaryEntry[];
          pageInfo?: { endCursor?: string | null; hasNext?: boolean };
        } | null;
      } | null;
    } | null;
  };
  errors?: Array<{ message: string }>;
}

export interface RouteInfo {
  routePath: string;
  name: string;
  updatedAt: string | null;
}

interface RoutesResponse {
  data?: {
    site?: {
      siteInfo?: {
        routes?: {
          results?: Array<{
            routePath?: string;
            route?: { name?: string; updated?: { value?: string } | null } | null;
          }>;
          pageInfo?: { endCursor?: string | null; hasNext?: boolean };
        } | null;
      } | null;
    } | null;
  };
  errors?: Array<{ message: string }>;
}

/** Normalize a Sitecore __Updated raw value ("20260628T103000Z" or ISO) to YYYY-MM-DD. */
function normalizeUpdated(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = /^(\d{4})-?(\d{2})-?(\d{2})/.exec(raw);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

const EDGE_PLATFORM_URL = 'https://edge-platform.sitecorecloud.io/v1/content/api/graphql/v1';

interface GraphQLResponse {
  errors?: Array<{ message: string }>;
}

export class EdgeClient {
  private readonly url: string;
  private readonly headers: Record<string, string>;

  constructor(
    private readonly config: EdgeConfig,
    private readonly fetchFn: typeof fetch = fetch,
  ) {
    if (config.contextId) {
      this.url = `${EDGE_PLATFORM_URL}?sitecoreContextId=${encodeURIComponent(config.contextId)}`;
      this.headers = { 'content-type': 'application/json' };
    } else if (config.endpoint && config.apiKey) {
      this.url = config.endpoint;
      this.headers = { 'content-type': 'application/json', sc_apikey: config.apiKey };
    } else {
      throw new Error('EdgeConfig requires either "contextId" or "endpoint" + "apiKey"');
    }
  }

  private async post<T extends GraphQLResponse>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await this.fetchFn(this.url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Edge request failed: HTTP ${res.status} ${text}`.trim());
    }

    const json = (await res.json()) as T;
    if (json.errors?.length) {
      throw new Error(`Edge GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`);
    }
    return json;
  }

  async getLayout(routePath: string, language: string): Promise<unknown> {
    const json = await this.post<LayoutResponse>(LAYOUT_QUERY, {
      site: this.config.site,
      routePath,
      language,
    });

    const rendered = json.data?.layout?.item?.rendered;
    if (!rendered) {
      throw new Error(`no route found at "${routePath}" for site "${this.config.site}" / lang "${language}"`);
    }
    return rendered;
  }

  async getDictionary(language: string): Promise<DictionaryEntry[]> {
    const entries: DictionaryEntry[] = [];
    let after: string | null = null;

    do {
      const json: DictionaryResponse = await this.post<DictionaryResponse>(DICTIONARY_QUERY, {
        site: this.config.site,
        language,
        after,
      });

      const dict = json.data?.site?.siteInfo?.dictionary;
      entries.push(...(dict?.results ?? []));

      const pageInfo = dict?.pageInfo;
      after = pageInfo?.hasNext && pageInfo.endCursor ? pageInfo.endCursor : null;
    } while (after !== null);

    return entries;
  }

  async getRoutes(language: string): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    let after: string | null = null;

    do {
      const json: RoutesResponse = await this.post<RoutesResponse>(ROUTES_QUERY, {
        site: this.config.site,
        language,
        after,
      });

      const conn = json.data?.site?.siteInfo?.routes;
      for (const r of conn?.results ?? []) {
        if (!r.routePath) continue;
        routes.push({
          routePath: r.routePath,
          name: r.route?.name ?? '',
          updatedAt: normalizeUpdated(r.route?.updated?.value),
        });
      }

      const pageInfo = conn?.pageInfo;
      after = pageInfo?.hasNext && pageInfo.endCursor ? pageInfo.endCursor : null;
    } while (after !== null);

    return routes;
  }
}
