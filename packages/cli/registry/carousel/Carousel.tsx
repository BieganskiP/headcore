'use client';

import { useState } from 'react';
import {
  Placeholder, useSitecore,
  ComponentRendering, Field, Item,
} from '@sitecore-content-sdk/nextjs';
import { CarouselProps } from './Carousel.types';

const CAROUSEL_PLACEHOLDER = 'headcore-carousel';

const CONTROL_CLASS =
  'cursor-pointer rounded px-2 py-1 text-lg leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

const DOT_CLASS =
  'h-2.5 w-2.5 cursor-pointer rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

function isComponentRendering(r: unknown): r is ComponentRendering {
  return typeof r === 'object' && r !== null && 'fields' in r;
}

function isTextField(field: Field | Item | Item[] | undefined): field is Field<string> {
  return !!field && 'value' in field && typeof (field as Field).value === 'string';
}

const Carousel = ({ rendering }: CarouselProps) => {
  const slides = (rendering.placeholders?.[CAROUSEL_PLACEHOLDER] ?? []).filter(isComponentRendering);
  const isEditing = useSitecore().page.mode.isEditing;
  const count = slides.length;

  const [active, setActive] = useState(0);

  const prev = () => setActive((i) => (i === 0 ? count - 1 : i - 1));
  const next = () => setActive((i) => (i === count - 1 ? 0 : i + 1));

  return (
    <section aria-roledescription="carousel" aria-label="Carousel" className="flex flex-col gap-4">
      {/* No autoplay, so polite live announcements on slide change are appropriate. */}
      <div aria-live={isEditing ? 'off' : 'polite'}>
        <Placeholder
          name={CAROUSEL_PLACEHOLDER}
          rendering={rendering}
          renderEach={(component, i) => {
            const slide = slides[i];
            const title = slide?.fields?.title;
            return (
              <div
                key={slide?.uid ?? i}
                role="group"
                aria-roledescription="slide"
                aria-label={
                  isTextField(title) && title.value ? title.value : `${i + 1} of ${count}`
                }
                hidden={!(isEditing || active === i)}
              >
                {component}
              </div>
            );
          }}
        />
      </div>

      {!isEditing && count > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button type="button" aria-label="Previous slide" className={CONTROL_CLASS} onClick={prev}>
            <span aria-hidden="true">‹</span>
          </button>
          {slides.map((slide, i) => (
            <button
              key={slide.uid ?? i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={active === i ? 'true' : undefined}
              className={`${DOT_CLASS} ${active === i ? 'bg-slate-600' : 'bg-slate-300 hover:bg-slate-400'}`}
              onClick={() => setActive(i)}
            />
          ))}
          <button type="button" aria-label="Next slide" className={CONTROL_CLASS} onClick={next}>
            <span aria-hidden="true">›</span>
          </button>
        </div>
      )}
    </section>
  );
};

export default Carousel;
