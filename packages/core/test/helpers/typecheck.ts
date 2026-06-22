import * as ts from 'typescript';
import { fileURLToPath } from 'node:url';
import type { GeneratedFile } from '../../src/types.js';

export interface CompileComponent {
  /** A unique virtual subfolder for this component's files (use the component name). */
  dir: string;
  files: GeneratedFile[];
}

/** Normalize path separators to forward-slashes (no case change). */
const normSep = (p: string): string => p.replace(/\\/g, '/');

/** Case-folded key for the virtual map — supports case-insensitive FS lookup. */
const normKey = (p: string): string => normSep(p).toLowerCase();

// A virtual root under cwd so the TS host treats paths as absolute on all OSes.
const VROOT = `${normSep(process.cwd())}/__virtual_typecheck__`;
const SHIM = fileURLToPath(new URL('./sitecore-shim.d.ts', import.meta.url));

/**
 * Type-checks the given generated components in a single in-memory program.
 * Returns formatted diagnostics ("file(line,col): message"); empty means clean.
 * Only .tsx and .types.ts files are compiled (mock JSON / CSS are ignored).
 */
export function typecheckComponents(components: CompileComponent[]): string[] {
  const virtual = new Map<string, string>();
  const roots: string[] = [SHIM];

  for (const c of components) {
    const compiled = c.files.filter((f) => f.path.endsWith('.tsx') || f.path.endsWith('.types.ts'));
    if (compiled.length === 0) {
      throw new Error(`component "${c.dir}" has no .tsx/.types.ts files to type-check`);
    }
    for (const f of compiled) {
      const base = f.path.split(/[\\/]/).pop() as string;
      // Keep original case in root paths so the import './Name.types' casing matches
      const vpath = `${VROOT}/${c.dir}/${base}`;
      // Store by lower-cased key for case-insensitive lookup (Windows FS semantics)
      virtual.set(normKey(vpath), f.contents);
      roots.push(vpath);
    }
  }

  const options: ts.CompilerOptions = {
    jsx: ts.JsxEmit.Preserve,
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    skipLibCheck: true,
  };

  const host = ts.createCompilerHost(options);
  const baseGetSourceFile = host.getSourceFile.bind(host);
  const baseFileExists = host.fileExists.bind(host);
  const baseReadFile = host.readFile.bind(host);
  const baseDirectoryExists = host.directoryExists?.bind(host);

  // Declare file names case-insensitive so TS treats 'Hero.types' / 'hero.types' as the same file
  host.useCaseSensitiveFileNames = () => false;

  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    const v = virtual.get(normKey(fileName));
    if (v !== undefined) {
      const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
      return ts.createSourceFile(fileName, v, languageVersion, true, kind);
    }
    return baseGetSourceFile(fileName, languageVersion, onError, shouldCreate);
  };
  host.fileExists = (fileName) => virtual.has(normKey(fileName)) || baseFileExists(fileName);
  host.readFile = (fileName) => virtual.get(normKey(fileName)) ?? baseReadFile(fileName);

  // Without this, TS skips probing virtual directories during module resolution
  host.directoryExists = (dirName) => {
    const k = normKey(dirName);
    if ([...virtual.keys()].some((key) => key.startsWith(k + '/'))) return true;
    return baseDirectoryExists ? baseDirectoryExists(dirName) : false;
  };

  const program = ts.createProgram({ rootNames: roots, options, host });
  return ts.getPreEmitDiagnostics(program).map((d) => {
    const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
    if (d.file && d.start !== undefined) {
      const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
      return `${normKey(d.file.fileName)}(${line + 1},${character + 1}): ${msg}`;
    }
    return msg;
  });
}
