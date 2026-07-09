import { Field } from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

type TabFields = {
  title: Field<string>;
};

type TabProps = ComponentProps & {
  fields: TabFields;
};

export type { TabFields, TabProps };
