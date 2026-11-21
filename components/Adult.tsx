'use client';

import { useEffect, useState } from 'react';

const KEY = 'ft-18-plus';
const EVENT = 'ft-adult-change';

function read() {
  try {
    return localStorage.getItem(KEY) === 'yes';
  } catch {
    return false;
  }
}

export function useAdult(): [boolean, () => void] {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(read());
    const sync = () => setOk(read());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const confirm = () => {
    try {
      localStorage.setItem(KEY, 'yes');
    } catch {
      /* ignore */
    }
    setOk(true);
    window.dispatchEvent(new Event(EVENT));
  };
  return [ok, confirm];
}

/** Blurs After Dark photos until the visitor says they are 18 or older. */
export function AdultBlur({ children }: { children: React.ReactNode }) {
  const [ok] = useAdult();
  return (
    <div className={`adult-blur${ok ? ' is-open' : ''}`}>
      {children}
      {!ok && <span className="adult-label">18+</span>}
    </div>
  );
}

export function AdultConfirm({ className = '' }: { className?: string }) {
  const [ok, confirm] = useAdult();
  if (ok) return <p className={`adult-ok ${className}`}>After Dark is unlocked on this device.</p>;
  return (
    <button type="button" className={`btn btn-line ${className}`} onClick={confirm}>
      I’m 18 or older
    </button>
  );
}
