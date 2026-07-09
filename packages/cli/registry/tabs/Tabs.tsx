'use client';

import { useState, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import {
  Placeholder, Text, useSitecore,
  ComponentRendering, Field, Item,
} from '@sitecore-content-sdk/nextjs';
import { TabsProps } from './Tabs.types';
import styles from './Tabs.module.css';

const TABS_PLACEHOLDER = 'headcore-tabs';

function isComponentRendering(r: unknown): r is ComponentRendering {
  return typeof r === 'object' && r !== null && 'fields' in r;
}

function isTextField(field: Field | Item | Item[] | undefined): field is Field<string> {
  return !!field && 'value' in field && typeof (field as Field).value === 'string';
}

const Tabs = ({ rendering }: TabsProps) => {
  const tabs = (rendering.placeholders?.[TABS_PLACEHOLDER] ?? []).filter(isComponentRendering);
  const isEditing = useSitecore().page.mode.isEditing;

  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTab = (i: number) => {
    setActive(i);
    tabRefs.current[i]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = tabs.length - 1;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        focusTab(active === last ? 0 : active + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        focusTab(active === 0 ? last : active - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusTab(0);
        break;
      case 'End':
        e.preventDefault();
        focusTab(last);
        break;
    }
  };

  return (
    <div className={styles.root}>
      <div role="tablist" aria-orientation="horizontal" className={styles.tablist}>
        {tabs.map((tab, i) => {
          const selected = active === i;
          return (
            <button
              key={tab.uid ?? i}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`tab-${tab.uid}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${tab.uid}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? styles.tabActive : styles.tab}
              onClick={() => setActive(i)}
              onKeyDown={onKeyDown}
            >
              {isTextField(tab.fields?.title) ? <Text field={tab.fields.title} /> : `Tab ${i + 1}`}
            </button>
          );
        })}
      </div>

      <Placeholder
        name={TABS_PLACEHOLDER}
        rendering={rendering}
        renderEach={(component, i) => {
          const tab = tabs[i];
          return (
            <div
              key={tab?.uid ?? i}
              id={`panel-${tab?.uid}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab?.uid}`}
              hidden={!(isEditing || active === i)}
              className={styles.panel}
            >
              {component}
            </div>
          );
        }}
      />
    </div>
  );
};

export default Tabs;
