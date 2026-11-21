'use client';

import { useState } from 'react';
import { useCart } from './CartProvider';

export interface QuickSize { size: string; label: string; text: string }
export interface QuickItem { slug: string; name: string; price: number; color: string; image?: string }

/** "Quick add" on a product card: pick a size and drop the pictured color in the bag without leaving the page. */
export default function QuickAdd({ item, sizes, showColor }: { item: QuickItem; sizes: QuickSize[]; showColor: boolean }) {
  const { add, setOpen } = useCart();
  const [picking, setPicking] = useState(false);
  if (!sizes.length) return null;

  const put = (s: QuickSize) => {
    add({ ...item, size: s.size, sizeLabel: s.text });
    setPicking(false);
    setOpen(true);
  };

  return (
    <div className="qa" onMouseLeave={() => setPicking(false)}>
      {picking ? (
        <div className="qa-panel" role="group" aria-label={`Pick a size for ${item.name}`}>
          <div className="qa-head">
            <span>Pick a size{showColor ? <em> · {item.color}</em> : null}</span>
            <button type="button" className="qa-x" onClick={() => setPicking(false)} aria-label="Close">×</button>
          </div>
          <div className="qa-sizes">
            {sizes.map((s) => (
              <button key={s.size} type="button" onClick={() => put(s)}>{s.label}</button>
            ))}
          </div>
        </div>
      ) : (
        <button type="button" className="qa-btn" onClick={() => (sizes.length === 1 ? put(sizes[0]) : setPicking(true))} aria-label={`Quick add ${item.name}`}>
          <span className="qa-plus" aria-hidden="true">+</span>
          <span className="qa-text">Quick add</span>
        </button>
      )}
    </div>
  );
}
