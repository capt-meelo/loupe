import React from 'react';
import { useLoupe } from '../../store.jsx';
import { EmptyState } from '../ui.jsx';

/**
 * getprop details, grouped. Loaded automatically on connect; the groups lay out
 * as a responsive grid across the full panel width.
 */
export function DeviceInfo() {
  const { s } = useLoupe();
  const groups = s.deviceInfo || [];
  const keyCount = groups.reduce((n, g) => n + g.rows.length, 0);

  if (!s.connected) return <EmptyState>Connect a device to read its properties.</EmptyState>;

  return (
    <>
      <div className="scroll" style={{ flex: '1 1 auto', minHeight: 0, padding: 10 }}>
        {groups.length === 0 ? (
          <div className="mono" style={{ color: 'var(--ink3)', padding: '6px 2px', fontSize: 11 }}>
            Reading getprop…
          </div>
        ) : (
          <div style={{
            display: 'grid', gap: 10,
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', alignItems: 'start'
          }}>
            {groups.map((g) => (
              <div key={g.title} style={{ border: '1px solid var(--line)', borderRadius: 7, overflow: 'hidden' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '5px 9px', background: 'var(--bg3)', borderBottom: '1px solid var(--line)'
                }}>
                  <span style={{ fontSize: 9.5, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink2)', fontWeight: 600 }}>
                    {g.title}
                  </span>
                  <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink3)' }}>{g.rows.length} keys</span>
                </div>
                {g.rows.map((r, i) => (
                  <div key={r.k} className="mono" style={{
                    display: 'grid', gridTemplateColumns: '92px minmax(0,1fr)', alignItems: 'baseline',
                    fontSize: 11, lineHeight: 1.55,
                    borderTop: i ? '1px solid var(--line)' : 'none',
                    background: i % 2 ? 'transparent' : 'var(--bg2)'
                  }}>
                    <span style={{ padding: '4px 9px', borderRight: '1px solid var(--line)', color: 'var(--ink3)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.k}
                    </span>
                    <span style={{ padding: '4px 9px', textAlign: 'right', wordBreak: 'break-word', color: r.color || 'var(--ink)' }}>
                      {r.v}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-foot"><span>{keyCount} properties</span></div>
    </>
  );
}
