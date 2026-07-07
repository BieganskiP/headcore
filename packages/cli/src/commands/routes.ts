import {
  loadConfig as defaultLoadConfig,
  EdgeClient,
  filterRoutes,
  sortRoutes,
  renderRoutesTable,
  renderRoutesJson,
  type RouteInfo,
  type RouteSort,
} from '@sitecore-scaffold/core';

export interface RoutesDeps {
  loadConfig: typeof defaultLoadConfig;
  getRoutes: (lang: string) => Promise<RouteInfo[]>;
}

export interface RoutesInput {
  lang: string | undefined;
  filter: string | undefined;
  sort: RouteSort;
  json: boolean;
}

export interface RoutesResult {
  output: string;
  count: number;
}

const CONFIG_PATH = `${process.cwd()}/sitecore-scaffold.config.ts`;

export async function runRoutes(input: RoutesInput, deps?: Partial<RoutesDeps>): Promise<RoutesResult> {
  const loadConfig = deps?.loadConfig ?? defaultLoadConfig;
  const config = await loadConfig(CONFIG_PATH);
  const lang = input.lang ?? config.edge.defaultLanguage;

  const getRoutes = deps?.getRoutes ?? ((l: string) => new EdgeClient(config.edge).getRoutes(l));
  const routes = sortRoutes(filterRoutes(await getRoutes(lang), input.filter), input.sort);

  const output = input.json ? renderRoutesJson(routes) : renderRoutesTable(routes, lang);
  return { output, count: routes.length };
}
