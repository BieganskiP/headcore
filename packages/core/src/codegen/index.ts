import type { ComponentContract, GeneratedFile, RenderingNode, ScaffoldConfig } from '../types.js';
import { renderTypesFile } from './types-file.js';
import { renderComponentFile } from './component-file.js';
import { renderMockFile } from './mock-file.js';

type CodegenConfig = Omit<ScaffoldConfig, 'edge'>;

export function generateFiles(
  contract: ComponentContract,
  node: RenderingNode,
  config: CodegenConfig,
): GeneratedFile[] {
  const base = `${config.componentPath}/${contract.name}`;
  const files: GeneratedFile[] = [
    { path: `${base}.types.ts`, contents: renderTypesFile(contract, config.componentPropsImport) },
    {
      path: `${base}.tsx`,
      contents: renderComponentFile(contract, {
        propsImport: config.componentPropsImport,
        sitecorePackage: config.sitecorePackage,
        useDatasourceCheck: config.useDatasourceCheck,
      }),
    },
  ];
  if (config.generateMocks) {
    files.push({ path: `${base}.mock.json`, contents: renderMockFile(node) });
  }
  return files;
}
