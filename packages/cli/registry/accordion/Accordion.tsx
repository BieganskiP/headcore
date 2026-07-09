'use client';

import { useState, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import {
  Placeholder, Text, useSitecore,
  ComponentRendering, Field, Item,
} from '@sitecore-content-sdk/nextjs';
import { AccordionProps } from './Accordion.types';
import styles from './Accordion.module.css';

const ACCORDION_PLACEHOLDER = 'headcore-accordion';

function isComponentRendering(r: unknown): r is ComponentRendering {
  return typeof r === 'object' && r !== null && 'fields' in r;
}

function isTextField(field: Field | Item | Item[] | undefined): field is Field<string> {
  return !!field && 'value' in field && typeof (field as Field).value === 'string';
}

const Accordion = ({ rendering, params }: AccordionProps) => {
  const items = (rendering.placeholders?.[ACCORDION_PLACEHOLDER] ?? []).filter(isComponentRendering);
  const isEditing = useSitecore().page.mode.isEditing;
  const allowMultiple = /^(1|true)$/i.test(params?.AllowMultiple ?? '');

  const [openSet, setOpenSet] = useState<Set<number>>(new Set());
  const headerRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const toggle = (i: number) => {
    setOpenSet((prev) => {
      if (prev.has(i)) {
        const next = new Set(prev);
        next.delete(i);
        return next;
      }
      return allowMultiple ? new Set(prev).add(i) : new Set([i]);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = items.length - 1;
    const focus = (j: number) => headerRefs.current[j]?.focus();
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focus(i === last ? 0 : i + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focus(i === 0 ? last : i - 1);
        break;
      case 'Home':
        e.preventDefault();
        focus(0);
        break;
      case 'End':
        e.preventDefault();
        focus(last);
        break;
    }
  };

  return (
    <div className={styles.root}>
      <Placeholder
        name={ACCORDION_PLACEHOLDER}
        rendering={rendering}
        renderEach={(component, i) => {
          const item = items[i];
          const uid = item?.uid ?? String(i);
          const title = item?.fields?.title;
          const open = isEditing || openSet.has(i);
          return (
            <div key={uid} className={styles.item}>
              <h3 className={styles.heading}>
                <button
                  ref={(el) => {
                    headerRefs.current[i] = el;
                  }}
                  id={`header-${uid}`}
                  type="button"
                  aria-expanded={open}
                  aria-controls={`panel-${uid}`}
                  className={styles.trigger}
                  onClick={() => toggle(i)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                >
                  {isTextField(title) ? <Text field={title} /> : `Item ${i + 1}`}
                  <span aria-hidden="true" className={styles.indicator} />
                </button>
              </h3>
              <div
                id={`panel-${uid}`}
                role="region"
                aria-labelledby={`header-${uid}`}
                hidden={!open}
                className={styles.panel}
              >
                {component}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
};

export default Accordion;
