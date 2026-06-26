export interface ParsedArgs {
  command: 'inspect' | 'component' | 'page' | 'dictionary';
  name: string | undefined;
  route: string | undefined;
  lang: string | undefined;
  dryRun: boolean;
  force: boolean;
  variants: string[];
}

const USAGE = `usage:
  sitecore-scaffold inspect <route>
  sitecore-scaffold page <route> [--lang <lang>] [--dry-run] [--force]
  sitecore-scaffold dictionary [--lang <lang>] [--dry-run] [--force]
  sitecore-scaffold component <Name> --route <route> [--lang <lang>] [--variants <A,B,C>] [--dry-run] [--force]`;

export function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0) throw new Error(USAGE);
  const [command, ...rest] = argv;
  if (command !== 'inspect' && command !== 'component' && command !== 'page' && command !== 'dictionary') {
    throw new Error(`unknown command "${command}"\n${USAGE}`);
  }

  const positionals: string[] = [];
  let route: string | undefined;
  let lang: string | undefined;
  let dryRun = false;
  let force = false;
  let variants: string[] = [];

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--route') route = rest[++i];
    else if (arg === '--lang') lang = rest[++i];
    else if (arg === '--variants') variants = (rest[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--force') force = true;
    else positionals.push(arg);
  }

  if (command === 'inspect' || command === 'page' || command === 'dictionary') {
    return { command, name: undefined, route: positionals[0], lang, dryRun, force, variants };
  }
  return { command, name: positionals[0], route, lang, dryRun, force, variants };
}
