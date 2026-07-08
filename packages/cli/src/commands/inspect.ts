import { loadConfig as defaultLoadConfig, EdgeClient, parseLayout, formatTree } from 'headcore-core';
import { resolveCliConfigPath } from '../config-path.js';

export interface InspectDeps {
  loadConfig: typeof defaultLoadConfig;
  getLayout: (route: string, lang: string) => Promise<unknown>;
}

export interface InspectInput {
  route: string | undefined;
  lang: string | undefined;
}

export async function runInspect(input: InspectInput, deps?: Partial<InspectDeps>): Promise<string> {
  if (!input.route) throw new Error('inspect requires a <route> argument');

  const loadConfig = deps?.loadConfig ?? defaultLoadConfig;
  const config = await loadConfig(resolveCliConfigPath());
  const lang = input.lang ?? config.edge.defaultLanguage;

  const getLayout = deps?.getLayout ?? ((route: string, l: string) => new EdgeClient(config.edge).getLayout(route, l));
  const rendered = await getLayout(input.route, lang);

  return formatTree(parseLayout(rendered, input.route));
}
