import type { HeadcoreConfig, StorybookConfig } from '../types.js';

/** Fill storybook defaults; the single place they're defined. */
export function resolveStorybook(config: Pick<HeadcoreConfig, 'storybook'>): StorybookConfig {
  return {
    enabled: config.storybook?.enabled ?? false,
    titlePrefix: config.storybook?.titlePrefix ?? 'Sitecore',
    decoratorPath: config.storybook?.decoratorPath ?? '.storybook/sitecore-decorator.tsx',
  };
}
