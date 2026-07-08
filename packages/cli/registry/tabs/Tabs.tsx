'use client';

import { useState } from 'react';
import { Text, Placeholder } from '@sitecore-content-sdk/nextjs';

import { TabsProps } from './Tabs.types';
import styles from './Tabs.module.css';

const TAB_COUNT = 3;

const Tabs = ({ fields, params, rendering }: TabsProps) => {
  const [active, setActive] = useState(0);
  const labels = [params?.Tab1Label, params?.Tab2Label, params?.Tab3Label];

  return (
    <section className={styles.root}>
      {fields?.Heading && (
        <div className={styles.heading}>
          <Text tag="h2" field={fields.Heading} />
        </div>
      )}

      <div role="tablist" className={styles.tablist}>
        {Array.from({ length: TAB_COUNT }).map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={active === i}
            className={active === i ? styles.tabActive : styles.tab}
            onClick={() => setActive(i)}
          >
            {labels[i] || `Tab ${i + 1}`}
          </button>
        ))}
      </div>

      {Array.from({ length: TAB_COUNT }).map((_, i) => (
        <div key={i} role="tabpanel" hidden={active !== i} className={styles.panel}>
          <Placeholder name={`tabs-${i + 1}`} rendering={rendering} />
        </div>
      ))}
    </section>
  );
};

export default Tabs;
