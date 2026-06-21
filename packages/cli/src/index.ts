import { parseArgs } from './args.js';
import { runInspect } from './commands/inspect.js';
import { runComponent } from './commands/component.js';

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === 'inspect') {
    const out = await runInspect({ route: args.route, lang: args.lang });
    process.stdout.write(out + '\n');
    return;
  }

  const result = await runComponent({
    name: args.name, route: args.route, lang: args.lang, dryRun: args.dryRun, force: args.force,
  });

  if (args.dryRun) {
    for (const f of result.preview) {
      process.stdout.write(`\n--- ${f.path} ---\n${f.contents}`);
    }
  } else {
    process.stdout.write(`Generated ${result.written.length} file(s):\n`);
    for (const f of result.written) process.stdout.write(`  ${f.path}\n`);
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
