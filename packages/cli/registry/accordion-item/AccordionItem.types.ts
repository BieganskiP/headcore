import { Field } from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

type AccordionItemFields = {
  title: Field<string>;
};

type AccordionItemProps = ComponentProps & {
  fields: AccordionItemFields;
};

export type { AccordionItemFields, AccordionItemProps };
