'use client';

import { useEffect } from 'react';

/**
 * Makes the filter/sort <details> dropdowns behave like menus: opening one closes the others,
 * and a click outside, Escape, or picking an option closes it.
 */
export default function DropdownCloser({ selector = 'details.filter' }: { selector?: string }) {
  useEffect(() => {
    const all = () => Array.from(document.querySelectorAll<HTMLDetailsElement>(selector));
    const closeAll = (except?: Element | null) => all().forEach((d) => { if (d !== except && d.open) d.open = false; });

    const onToggle = (e: Event) => {
      const d = e.target as HTMLDetailsElement;
      if (d.matches?.(selector) && d.open) closeAll(d);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element;
      const inside = t.closest(selector);
      if (!inside) closeAll();
      else if (t.closest('summary')) closeAll(inside); // opening (or closing) this one: shut the rest
      else if (t.closest('a, button')) (inside as HTMLDetailsElement).open = false; // picked an option
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAll(); };

    document.addEventListener('toggle', onToggle, true);
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('toggle', onToggle, true);
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [selector]);
  return null;
}
