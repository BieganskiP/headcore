export interface ParsedArgs {
  command: 'inspect' | 'component' | 'page' | 'dictionary' | 'routes';
  name: string | undefined;
  route: string | undefined;
  lang: string | undefined;
  dryRun: boolean;
  force: boolean;
  variants: string[];
  filter: string | undefined;
  sort: 'path' | 'updated';
  json: boolean;
  out: string | undefined;
}

const USAGE = `usage:
  sitecore-scaffold inspect <route>
  sitecore-scaffold page <route> [--lang <lang>] [--dry-run] [--force]
  sitecore-scaffold dictionary [--lang <lang>] [--dry-run] [--force]
  sitecore-scaffold routes [--lang <lang>] [--filter <substring>] [--sort path|updated] [--json] [--out <file>]
  sitecore-scaffold component <Name> --route <route> [--lang <lang>] [--variants <A,B,C>] [--dry-run] [--force]`;

export function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0) throw new Error(USAGE);
  const [command, ...rest] = argv;
  if (
    command !== 'inspect' && command !== 'component' && command !== 'page' &&
    command !== 'dictionary' && command !== 'routes'
  ) {
    throw new Error(`unknown command "${command}"\n${USAGE}`);
  }

  const positionals: string[] = [];
  let route: string | undefined;
  let lang: string | undefined;
  let dryRun = false;
  let force = false;
  let variants: string[] = [];
  let filter: string | undefined;
  let sort: 'path' | 'updated' = 'path';
  let json = false;
  let out: string | undefined;

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--route') route = rest[++i];
    else if (arg === '--lang') lang = rest[++i];
    else if (arg === '--variants') variants = (rest[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--force') force = true;
    else if (arg === '--filter') filter = rest[++i];
    else if (arg === '--json') json = true;
    else if (arg === '--out') {
      out = rest[++i];
      if (out === undefined) throw new Error(`--out requires a file path\n${USAGE}`);
    }
    else if (arg === '--sort') {
      const value = rest[++i];
      if (value !== 'path' && value !== 'updated') {
        throw new Error(`--sort must be "path" or "updated", got "${value ?? ''}"\n${USAGE}`);
      }
      sort = value;
    } else positionals.push(arg);
  }

  if (command === 'inspect' || command === 'page' || command === 'dictionary' || command === 'routes') {
    return { command, name: undefined, route: positionals[0], lang, dryRun, force, variants, filter, sort, json, out };
  }
  return { command, name: positionals[0], route, lang, dryRun, force, variants, filter, sort, json, out };
}
