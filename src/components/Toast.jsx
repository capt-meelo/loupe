import React from 'react';
import { useLoupe } from '../store.jsx';

export function Toast() {
  const { s } = useLoupe();
  if (!s.toast) return null;
  return (
    <div className="toast" key={s.toast}>
      <span className="dot" style={{ width: 6, height: 6, background: 'var(--accentFill)' }} />
      {s.toast}
    </div>
  );
}
