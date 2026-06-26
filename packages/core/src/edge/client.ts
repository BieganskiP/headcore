import type { EdgeConfig } from '../types.js';
import { LAYOUT_QUERY, DICTIONARY_QUERY } from './query.js';

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

export class EdgeClient {
  constructor(
    private readonly config: EdgeConfig,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async getLayout(routePath: string, language: string): Promise<unknown> {
    const res = await this.fetchFn(this.config.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', sc_apikey: this.config.apiKey },
      body: JSON.stringify({
        query: LAYOUT_QUERY,
        variables: { site: this.config.site, routePath, language },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Edge request failed: HTTP ${res.status} ${text}`.trim());
    }

    const json = (await res.json()) as LayoutResponse;
    if (json.errors?.length) {
      throw new Error(`Edge GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`);
    }

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
      const res = await this.fetchFn(this.config.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', sc_apikey: this.config.apiKey },
        body: JSON.stringify({
          query: DICTIONARY_QUERY,
          variables: { site: this.config.site, language, after },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Edge request failed: HTTP ${res.status} ${text}`.trim());
      }

      const json = (await res.json()) as DictionaryResponse;
      if (json.errors?.length) {
        throw new Error(`Edge GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`);
      }

      const dict = json.data?.site?.siteInfo?.dictionary;
      entries.push(...(dict?.results ?? []));

      const pageInfo = dict?.pageInfo;
      after = pageInfo?.hasNext && pageInfo.endCursor ? pageInfo.endCursor : null;
    } while (after !== null);

    return entries;
  }
}
