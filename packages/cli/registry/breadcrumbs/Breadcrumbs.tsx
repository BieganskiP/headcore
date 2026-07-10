import Link from 'next/link';
import { useSitecore, useComponentProps } from '@sitecore-content-sdk/nextjs';
import { BreadcrumbsData, BreadcrumbsProps } from './Breadcrumbs.types';

export { getComponentServerProps } from './Breadcrumbs.data';

const Breadcrumbs = ({ rendering, crumbs }: BreadcrumbsProps) => {
  const fetched = useComponentProps<BreadcrumbsData>(rendering.uid);
  const isEditing = useSitecore().page.mode.isEditing;
  const trail = crumbs ?? fetched?.crumbs ?? [];

  if (trail.length < 2) {
    // Nothing to show on the home page (or when data is unavailable); in the
    // editor, keep the rendering visible so it can still be selected.
    return isEditing ? (
      <div className="inline-block rounded border border-dashed border-slate-400 px-2 py-1 text-slate-500">
        Breadcrumbs
      </div>
    ) : null;
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.label,
      item: crumb.href,
    })),
  };

  const last = trail.length - 1;
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {trail.map((crumb, i) => (
          <li
            key={i}
            className={`flex items-center gap-2${
              i > 0 ? " before:text-slate-400 before:content-['/']" : ''
            }`}
          >
            {i === last ? (
              <span aria-current="page" className="text-slate-500">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-inherit no-underline hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c').replace(/>/g, '\\u003e'),
        }}
      />
    </nav>
  );
};

export default Breadcrumbs;
