import type { StylingMode } from '../types.js';

export interface StyleHelper {
  /** Import line for the stylesheet (CSS Modules), or '' when none is needed. */
  importLine: string;
  /** className attribute for the root <section>, incl. leading space, or ''. */
  root: string;
  /** className attribute for a card <article>, incl. leading space, or ''. */
  card: string;
  /** CSS Module file contents, or null when no stylesheet is generated. */
  cssFile: string | null;
}

const TAILWIND = {
  root: 'flex flex-col gap-4',
  card: 'rounded-lg border border-gray-200 p-4',
};

const CSS_MODULE = `.root {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
}
`;

/** Resolves how class names, imports, and an optional CSS file are produced for a component. */
export function createStyleHelper(componentName: string, mode: StylingMode): StyleHelper {
  if (mode === 'tailwind') {
    return {
      importLine: '',
      root: ` className="${TAILWIND.root}"`,
      card: ` className="${TAILWIND.card}"`,
      cssFile: null,
    };
  }
  if (mode === 'css') {
    return {
      importLine: `import styles from './${componentName}.module.css';\n`,
      root: ' className={styles.root}',
      card: ' className={styles.card}',
      cssFile: CSS_MODULE,
    };
  }
  // 'none' — keep a plain card class, no stylesheet, no root class.
  return { importLine: '', root: '', card: ' className="card"', cssFile: null };
}
