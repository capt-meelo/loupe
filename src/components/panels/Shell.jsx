import React, { useEffect, useRef } from 'react';
import { useLoupe } from '../../store.jsx';

const LINE_COLOR = { cmd: 'var(--accent)', dim: 'var(--ink3)' };

export function Shell() {
  const { s, set, runShell } = useLoupe();
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; });

  const onKeyDown = (e) => {
    if (e.key === 'Enter') return runShell(s.shellIn);
    if (e.key === 'ArrowUp' && s.hist.length) {
      e.preventDefault();
      const ix = s.histIx < 0 ? s.hist.length - 1 : Math.max(0, s.histIx - 1);
      return set({ histIx: ix, shellIn: s.hist[ix] });
    }
    if (e.key === 'ArrowDown' && s.histIx >= 0) {
      e.preventDefault();
      const ix = s.histIx + 1;
      return ix >= s.hist.length ? set({ histIx: -1, shellIn: '' }) : set({ histIx: ix, shellIn: s.hist[ix] });
    }
    return undefined;
  };

  return (
    <>
      <div ref={ref} className="scroll mono" style={{ flex: '1 1 auto', padding: '9px 11px', fontSize: 11.5, lineHeight: 1.7 }}>
        {s.shell.map((l, i) => (
          <div key={i} style={{ color: LINE_COLOR[l.k] || 'var(--ink2)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {l.t}
          </div>
        ))}
      </div>
      <div style={{
        flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 11px', borderTop: '1px solid var(--line)', background: 'var(--bg2)'
      }}>
        <span className="mono" style={{ fontSize: 11.5, color: 'var(--accent)' }}
          title={s.rootMode ? 'Root shell (su)' : 'Unprivileged shell'}>
          {s.rootMode ? '#' : '$'}
        </span>
        <input className="mono" value={s.shellIn} onKeyDown={onKeyDown}
          onChange={(e) => set({ shellIn: e.target.value })}
          placeholder={s.connected ? 'adb shell: try: getprop ro.product.model' : 'connect a device first'}
          style={{ flex: '1 1 auto', minWidth: 0, fontSize: 11.5 }} />
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>↑ history</span>
      </div>
    </>
  );
}
