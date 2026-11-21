'use client';

import { useState } from 'react';
import { BODY, BOTTOM_CATS, FOOT_CM, cmText, euFor, normSize, shoeUS, toInch, usSize, type SizeChart } from '@/lib/sizing';

/** Size guide: this piece's measurements and the body measurements for each size, labeled in US and EU sizes. */
export default function SizeGuide({ chart, sizes, category, oversized }: { chart?: SizeChart; sizes: string[]; category: string; oversized: boolean }) {
  const [unit, setUnit] = useState<'cm' | 'in'>('in');
  const v = (x: string) => (unit === 'cm' ? cmText(x) : toInch(x));
  const shoes = category === 'shoes';
  const bottoms = BOTTOM_CATS.has(category);
  const letters = shoes ? [] : sizes.map(normSize).filter((s, i, a) => usSize(s, oversized) && BODY[s] && a.indexOf(s) === i);
  const shoeRows = shoes ? sizes.map(normSize).filter((s, i, a) => FOOT_CM[s] && a.indexOf(s) === i) : [];
  const us = (s: string) => usSize(s, oversized);
  const toggle = (
    <div className="sg-unit" role="group" aria-label="Units">
      <button type="button" className={unit === 'cm' ? 'is-on' : ''} onClick={() => setUnit('cm')}>CM</button>
      <button type="button" className={unit === 'in' ? 'is-on' : ''} onClick={() => setUnit('in')}>IN</button>
    </div>
  );
  let shownToggle = false;
  const head = (title: string) => {
    const t = !shownToggle;
    shownToggle = true;
    return <div className="sg-top"><span className="sg-title">{title}</span>{t && toggle}</div>;
  };
  const sizeCells = (s: string) => {
    if (shoes) { const u = shoeUS(s); return <><td>{u.w ?? '–'}</td><td>{s}</td></>; }
    const u = us(s);
    return u ? <><td>{u}</td><td>{euFor(u)}</td></> : <><td colSpan={2}>{s}</td></>;
  };
  const sizeHeads = shoes ? <><th>US</th><th>EU</th></> : <><th>US</th><th>EU</th></>;

  return (
    <div className="size-guide">
      {chart && (
        <>
          {head('Measurements of this piece')}
          <div className="sg-scroll">
            <table className="sg-table">
              <thead><tr>{sizeHeads}{chart.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {chart.rows.map(([size, ...vals]) => (
                  <tr key={size}>{sizeCells(normSize(size))}{vals.map((x, i) => <td key={i}>{v(x)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="sg-note">
            {shoes
              ? 'Foot length is heel to longest toe. Pick the size that matches your foot or is slightly longer.'
              : 'Measured on the garment itself. For the best fit, lay a piece you own flat, measure it, and compare.'}
          </p>
        </>
      )}
      {shoeRows.length > 0 && (
        <>
          {head('Shoe sizes')}
          <div className="sg-scroll">
            <table className="sg-table">
              <thead><tr><th>EU</th><th>US women</th><th>US men</th><th>Foot length</th></tr></thead>
              <tbody>{shoeRows.map((s) => { const u = shoeUS(s); return <tr key={s}><td>{s}</td><td>{u.w ?? '–'}</td><td>{u.m ?? '–'}</td><td>{v(FOOT_CM[s])}</td></tr>; })}</tbody>
            </table>
          </div>
        </>
      )}
      {letters.length > 0 && (
        <>
          {head('Body measurements')}
          <div className="sg-scroll">
            <table className="sg-table">
              <thead><tr><th>US</th><th>EU</th>{!bottoms && <th>Bust</th>}<th>Waist</th><th>Hip</th></tr></thead>
              <tbody>
                {letters.map((s) => (
                  <tr key={s}>
                    <td>{us(s)}</td><td>{euFor(us(s)!)}</td>
                    {!bottoms && <td>{v(BODY[s].bust)}</td>}
                    <td>{v(BODY[s].waist)}</td>
                    <td>{v(BODY[s].hip)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="sg-note">Measure around the fullest part of your {bottoms ? 'hips' : 'bust and hips'} and the narrowest part of your waist, then pick the size that matches.</p>
        </>
      )}
      <p className="sg-note">
        {shoes
          ? 'If you are between sizes, go half a size up.'
          : oversized
            ? 'This piece is cut oversized on purpose for a relaxed, baggy fit.'
            : 'Fitted tops and baby tees are made to be snug. If you are between sizes or want a looser fit, size up.'}
      </p>
    </div>
  );
}
