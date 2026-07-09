import { Placeholder, withDatasourceCheck } from '@sitecore-content-sdk/nextjs';
import { AccordionItemProps } from './AccordionItem.types';

const AccordionItem = ({ rendering }: AccordionItemProps) => (
  <div className="headcore-accordion-item">
    <Placeholder name="headcore-accordion-item-content" rendering={rendering} />
  </div>
);

export default withDatasourceCheck()<AccordionItemProps>(AccordionItem);
