import { ComponentProps } from 'lib/component-props';

type Crumb = {
  label: string;
  href: string;
};

type BreadcrumbsData = {
  crumbs: Crumb[];
};

type BreadcrumbsProps = ComponentProps & Partial<BreadcrumbsData>;

export type { Crumb, BreadcrumbsData, BreadcrumbsProps };
