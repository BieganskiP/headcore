import { relative, resolve } from 'node:path';

/** The subset of a mock's placeholder tree the story renderer needs. */
export interface StoryMockNode {
  componentName: string;
  placeholders?: Record<string, StoryMockNode[]>;
}

export interface StoryFileConfig {
  componentPath: string;
  componentFolder: boolean;
  titlePrefix: string;
  decoratorPath: string;
}

/** Relative ESM import specifier from `fromDir` to `toFile` (extension stripped, posix slashes). */
function relativeImport(fromDir: string, toFile: string): string {
  const raw = relative(resolve(fromDir), resolve(toFile))
    .replace(/\\/g, '/')
    .replace(/\.tsx?$/, '');
  return raw.startsWith('.') ? raw : `./${raw}`;
}

/** Unique component names appearing anywhere in the placeholder tree, sorted. */
function collectChildNames(placeholders: Record<string, StoryMockNode[]> | undefined): string[] {
  const names = new Set<string>();
  const visit = (nodes: StoryMockNode[]) => {
    for (const n of nodes) {
      names.add(n.componentName);
      for (const children of Object.values(n.placeholders ?? {})) visit(children);
    }
  };
  for (const nodes of Object.values(placeholders ?? {})) visit(nodes);
  return [...names].sort();
}

/**
 * Render a CSF3 story that feeds the component its mock as both loose args and
 * a `rendering` node, wrapped in the shared `withSitecore` decorator. Children
 * referenced by the mock's placeholders are imported from sibling component
 * folders and passed as the decorator's component map so `<Placeholder>` resolves.
 */
export function renderStoryFile(
  name: string,
  mockPlaceholders: Record<string, StoryMockNode[]> | undefined,
  config: StoryFileConfig,
): string {
  const dir = config.componentFolder ? `${config.componentPath}/${name}` : config.componentPath;
  const decoratorImport = relativeImport(dir, config.decoratorPath);
  const children = collectChildNames(mockPlaceholders).filter((child) => child !== name);
  const childPath = (child: string) => (config.componentFolder ? `../${child}/${child}` : `./${child}`);
  const childImports = children.map((c) => `import ${c} from '${childPath(c)}';\n`).join('');
  const title = config.titlePrefix ? `${config.titlePrefix}/${name}` : name;
  const mapArg = children.length > 0 ? `{ ${children.join(', ')} }` : '';

  return `import type { Meta, StoryObj } from '@storybook/react';
import ${name} from './${name}';
import mock from './${name}.mock.json';
import { withSitecore } from '${decoratorImport}';
${childImports}
const meta = {
  title: '${title}',
  component: ${name},
  decorators: [withSitecore(${mapArg})],
} satisfies Meta<typeof ${name}>;
export default meta;

export const Default: StoryObj<typeof meta> = {
  args: { ...mock, rendering: { componentName: '${name}', ...mock } },
};
`;
}
