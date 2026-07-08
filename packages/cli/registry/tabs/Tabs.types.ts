import { Field } from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

type TabsFields = {
  Heading?: Field<string>;
};

type TabsParams = {
  Tab1Label?: string;
  Tab2Label?: string;
  Tab3Label?: string;
};

type TabsProps = ComponentProps & {
  fields: TabsFields;
  params?: TabsParams;
};

export type { TabsFields, TabsParams, TabsProps };
