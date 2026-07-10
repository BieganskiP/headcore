import { Field } from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

type CarouselSlideFields = {
  title: Field<string>;
};

type CarouselSlideProps = ComponentProps & {
  fields: CarouselSlideFields;
};

export type { CarouselSlideFields, CarouselSlideProps };
