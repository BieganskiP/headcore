// Ambient stubs so generated output can be type-checked without the real
// Sitecore SDK or the project's lib/component-props. Permissive about component
// props (any returns) to avoid JSX false-positives; field/item types are real so
// duplicate-identifier and member-access bugs are still caught.
declare module '@sitecore-content-sdk/nextjs' {
  export type Field<T = string> = { value?: T; editable?: string };
  export type ImageField = { value?: { src?: string; alt?: string; width?: number; height?: number } };
  export type LinkField = { value?: { href?: string; text?: string; target?: string } };
  export const Text: (props: { field?: { value?: string | number }; tag?: string; className?: string }) => any;
  export const RichText: (props: { field?: Field<string>; className?: string }) => any;
  export const Image: (props: { field?: ImageField; className?: string }) => any;
  export const Link: (props: { field?: LinkField; className?: string }) => any;
  export const Placeholder: (props: { name: string; rendering: unknown }) => any;
  export function withDatasourceCheck(): <P>(Component: (props: P) => any) => (props: P) => any;
}

declare module 'lib/component-props' {
  export type ComponentProps = { rendering?: unknown; params?: { [k: string]: string | undefined } };
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [elem: string]: any;
  }
}
