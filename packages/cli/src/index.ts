import { parseArgs } from './args.js';
import { runInspect } from './commands/inspect.js';
import { runComponent } from './commands/component.js';
import { runPage } from './commands/page.js';
import { runDictionary } from './commands/dictionary.js';
import { runRoutes } from './commands/routes.js';

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === 'inspect') {
    const out = await runInspect({ route: args.route, lang: args.lang });
    process.stdout.write(out + '\n');
    return;
  }

  if (args.command === 'page') {
    const result = await runPage({ route: args.route, lang: args.lang, dryRun: args.dryRun, force: args.force });

    if (args.dryRun) {
      for (const c of result.components) {
        for (const f of c.files) process.stdout.write(`\n--- ${f.path} ---\n${f.contents}`);
      }
      return;
    }

    process.stdout.write(`Page ${result.route} — ${result.components.length} component type(s) found\n\n`);
    const generated = result.components.filter((c) => c.status === 'generated');
    const skipped = result.components.filter((c) => c.status === 'skipped');

    if (generated.length > 0) {
      process.stdout.write('Generated:\n');
      for (const c of generated) {
        const merged = c.instanceCount > 1 ? `   [merged from ${c.instanceCount} instances]` : '';
        process.stdout.write(`  ${c.name} (${c.files.length} file(s))${merged}\n`);
      }
    }
    if (skipped.length > 0) {
      process.stdout.write('Skipped (already exist, use --force):\n');
      for (const c of skipped) process.stdout.write(`  ${c.name}\n`);
    }
    if (result.warnings.length > 0) {
      process.stdout.write('\nWarnings:\n');
      for (const w of result.warnings) process.stdout.write(`  ${w}\n`);
    }
    return;
  }

  if (args.command === 'dictionary') {
    const result = await runDictionary({ lang: args.lang, dryRun: args.dryRun, force: args.force });

    if (args.dryRun) {
      for (const f of result.files) process.stdout.write(`\n--- ${f.path} ---\n${f.contents}`);
      if (result.warnings.length > 0) {
        process.stdout.write('\nWarnings:\n');
        for (const w of result.warnings) process.stdout.write(`  ${w}\n`);
      }
      return;
    }

    process.stdout.write('Dictionary types generated:\n');
    for (const f of result.files) {
      const note = f.status === 'skipped' ? ' (skipped, already exists — use --force)' : '';
      process.stdout.write(`  ${f.path}${note}\n`);
    }
    if (result.warnings.length > 0) {
      process.stdout.write('\nWarnings:\n');
      for (const w of result.warnings) process.stdout.write(`  ${w}\n`);
    }
    return;
  }

  if (args.command === 'routes') {
    const result = await runRoutes({ lang: args.lang, filter: args.filter, sort: args.sort, json: args.json, out: args.out });
    process.stdout.write(result.output + '\n');
    return;
  }

  const result = await runComponent({
    name: args.name, route: args.route, lang: args.lang, dryRun: args.dryRun, force: args.force, variants: args.variants,
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
