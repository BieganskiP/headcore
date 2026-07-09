import { Placeholder } from '@sitecore-content-sdk/nextjs';
import { TabProps } from './Tab.types';

const Tab = ({ rendering }: TabProps) => (
  <div className="headcore-tab">
    <Placeholder name="headcore-tab-content" rendering={rendering} />
  </div>
);

export default Tab;
