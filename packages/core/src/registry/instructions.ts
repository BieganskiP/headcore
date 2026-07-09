import type { ComponentManifest } from './manifest.js';

/** Render Markdown instructions for modeling a component's Sitecore side. */
export function renderSitecoreInstructions(m: ComponentManifest): string {
  const { template, rendering, placeholders, params } = m.sitecore;

  const fieldLines =
    template.fields.length > 0
      ? template.fields.map((f) => `   - ${f.name} (${f.type})`).join('\n')
      : '   - No datasource fields — this component has no datasource template.';

  const placeholderLines = placeholders
    .map((p) => {
      const allows = p.allowedRenderings.includes('*') ? 'any rendering' : p.allowedRenderings.join(', ');
      const dyn = p.dynamic ? ' (dynamic key)' : '';
      return `   - \`${p.key}\`${dyn} — allows: ${allows}`;
    })
    .join('\n');

  const paramLines =
    params.length > 0
      ? params
          .map((p) => {
            const type = p.type ? ` (${p.type})` : '';
            const desc = p.description ? ` — ${p.description}` : '';
            return `   - ${p.name}${type}${desc}`;
          })
          .join('\n')
      : '   - None.';

  return `# Sitecore setup for ${m.name}

${m.description}

## 1. Template
Create a template named **${template.name}** with fields:
${fieldLines}

## 2. Rendering
Create a **${rendering.type}** named **${rendering.componentName}** whose component name is \`${rendering.componentName}\` (must match the React component).

## 3. Placeholder settings
Expose these placeholders on the rendering:
${placeholderLines}

## 4. Rendering parameters
Add these parameters to the rendering's parameters template:
${paramLines}
`;
}
