import Link from 'next/link';
import { useSitecore, useComponentProps } from '@sitecore-content-sdk/nextjs';
import { BreadcrumbsData, BreadcrumbsProps } from './Breadcrumbs.types';
import styles from './Breadcrumbs.module.css';

export { getComponentServerProps } from './Breadcrumbs.data';

const Breadcrumbs = ({ rendering, crumbs }: BreadcrumbsProps) => {
  const fetched = useComponentProps<BreadcrumbsData>(rendering.uid);
  const isEditing = useSitecore().page.mode.isEditing;
  const trail = crumbs ?? fetched?.crumbs ?? [];

  if (trail.length < 2) {
    // Nothing to show on the home page (or when data is unavailable); in the
    // editor, keep the rendering visible so it can still be selected.
    return isEditing ? <div className={styles.editorChip}>Breadcrumbs</div> : null;
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
    <nav aria-label="Breadcrumb" className={styles.root}>
      <ol className={styles.list}>
        {trail.map((crumb, i) => (
          <li key={i} className={styles.item}>
            {i === last ? (
              <span aria-current="page" className={styles.current}>
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href} className={styles.link}>
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
