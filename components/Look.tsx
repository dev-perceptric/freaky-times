'use client';

import { useEffect, useState } from 'react';
import { useCart } from './CartProvider';
import { formatPrice } from '@/lib/money';
import { img } from '@/lib/img';
import type { QuickItem, QuickSize } from './QuickAdd';

export interface LookPiece { label: string; item: QuickItem; sizes: QuickSize[] }

/** "Complete the look" with an "Add the look" button that puts every piece in the bag at once. */
export default function Look({ pieces, children }: { pieces: LookPiece[]; children: React.ReactNode }) {
  const { add, setOpen } = useCart();
  const [picking, setPicking] = useState(false);
  const [on, setOn] = useState<boolean[]>(() => pieces.map(() => true));
  const [size, setSize] = useState<(string | undefined)[]>(() => pieces.map((p) => (p.sizes.length === 1 ? p.sizes[0].size : undefined)));
  const total = pieces.reduce((n, p) => n + p.item.price, 0);
  const chosen = pieces.map((p, i) => ({ p, i })).filter(({ i }) => on[i]);
  const missing = chosen.some(({ i }) => !size[i]);
  const chosenTotal = chosen.reduce((n, { p }) => n + p.item.price, 0);

  useEffect(() => {
    if (!picking) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setPicking(false);
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [picking]);

  const addAll = (which: { p: LookPiece; i: number }[]) => {
    for (const { p, i } of which) {
      const s = p.sizes.find((x) => x.size === size[i]) ?? p.sizes[0];
      add({ ...p.item, size: s.size, sizeLabel: s.text });
    }
    setPicking(false);
    setOpen(true);
  };

  // Every piece is one size: no need to ask.
  const start = () => (pieces.every((p) => p.sizes.length === 1) ? addAll(pieces.map((p, i) => ({ p, i }))) : setPicking(true));

  return (
    <div className="wrap">
      <div className="sec-head">
        <div>
          <h2>Complete the look</h2>
          <p className="sec-sub">Picked to go with this piece</p>
        </div>
        <button type="button" className="btn btn-pink look-add" onClick={start}>Add the look · {formatPrice(total)}</button>
      </div>
      <div className="grid">{children}</div>

      {picking && (
        <div className="lk-root" role="dialog" aria-modal="true" aria-label="Add the look">
          <div className="lk-scrim" onClick={() => setPicking(false)} />
          <div className="lk-sheet">
            <div className="lk-head">
              <h3>Add the look</h3>
              <button type="button" className="qa-x" onClick={() => setPicking(false)} aria-label="Close">×</button>
            </div>
            <ul className="lk-list">
              {pieces.map((p, i) => (
                <li key={p.item.slug} className={on[i] ? '' : 'is-off'}>
                  <label className="lk-check">
                    <input type="checkbox" checked={on[i]} onChange={() => setOn((v) => v.map((x, j) => (j === i ? !x : x)))} />
                    <span className="sr-only">Include {p.item.name}</span>
                  </label>
                  {p.item.image && <img src={img(p.item.image, 160)} alt="" className="lk-img" />}
                  <div className="lk-info">
                    <span className="tile-kicker">{p.label}</span>
                    <span className="lk-name">{p.item.name}</span>
                    <span className="lk-price">{formatPrice(p.item.price)}</span>
                    {p.sizes.length > 1 ? (
                      <div className="qa-sizes lk-sizes" role="group" aria-label={`Size for ${p.item.name}`}>
                        {p.sizes.map((s) => (
                          <button key={s.size} type="button" aria-pressed={size[i] === s.size} className={size[i] === s.size ? 'is-on' : ''} disabled={!on[i]}
                            onClick={() => setSize((v) => v.map((x, j) => (j === i ? s.size : x)))}>{s.label}</button>
                        ))}
                      </div>
                    ) : (
                      <span className="lk-one">{p.sizes[0]?.label ?? 'One size'}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="lk-foot">
              {missing && <p className="lk-hint">Pick a size for each piece</p>}
              <button type="button" className="btn btn-block" disabled={!chosen.length || missing} onClick={() => addAll(chosen)}>
                Add {chosen.length} {chosen.length === 1 ? 'piece' : 'pieces'} · {formatPrice(chosenTotal)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
