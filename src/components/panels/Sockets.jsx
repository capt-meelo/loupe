import React, { useEffect, useMemo } from 'react';
import { useLoupe } from '../../store.jsx';
import { Search, EmptyState } from '../ui.jsx';

/**
 * Live network sockets from the device (`ss -tunp`). Decoding HTTP is the Proxy
 * tab's job (device proxy + CA); this panel shows the real connection table.
 */
export function Sockets() {
  const { s, set, loadNet } = useLoupe();

  useEffect(() => {
    if (s.connected && s.net.length === 0 && !s.netBusy) loadNet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.connected]);

  const rows = useMemo(() => {
    const q = s.netQ.toLowerCase();
    let list = s.net;
    if (q) list = list.filter((r) => (r.peer + r.local + r.proc).toLowerCase().includes(q));
    return list;
  }, [s.net, s.netQ]);

  if (!s.connected) return <EmptyState>Connect a device to see its network connections.</EmptyState>;

  const stateColor = (st) =>
    st === 'ESTAB' ? 'var(--ok)' : st.startsWith('LISTEN') ? 'var(--li)' : 'var(--ink2)';

  return (
    <>
      <div className="panel-toolbar">
        <Search value={s.netQ} onChange={(e) => set({ netQ: e.target.value })} placeholder="host, port, process…" grow="0 1 50%" />
        <div className="spacer" />
        <button className="btn-quiet" onClick={loadNet} disabled={s.netBusy}>
          {s.netBusy ? 'Reading…' : 'Reload'}
        </button>
      </div>

      <div className="mono" style={{
        flex: '0 0 auto', display: 'flex', gap: 8, padding: '5px 10px',
        borderBottom: '1px solid var(--line)', fontSize: 10, color: 'var(--ink3)'
      }}>
        <span style={{ width: 44 }}>PROTO</span>
        <span style={{ width: 62 }}>STATE</span>
        <span style={{ flex: '1 1 auto' }}>PEER</span>
        <span style={{ width: 150 }}>LOCAL</span>
        <span style={{ width: 150 }}>PROCESS</span>
      </div>

      <div className="scroll mono" style={{ flex: '1 1 auto', fontSize: 11 }}>
        {rows.length === 0 && !s.netBusy && (
          <div style={{ color: 'var(--ink3)', padding: '10px 12px' }}>No sockets matched.</div>
        )}
        {rows.map((r, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, alignItems: 'center', padding: '5px 10px',
            borderBottom: '1px solid var(--line)'
          }}>
            <span style={{ width: 44, color: 'var(--ink3)' }}>{r.proto}</span>
            <span style={{ width: 62, color: stateColor(r.state), fontWeight: 600 }}>{r.state}</span>
            <span style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.peer}
            </span>
            <span style={{ width: 150, color: 'var(--ink2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.local}
            </span>
            <span style={{ width: 150, color: 'var(--ink3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.proc}
            </span>
          </div>
        ))}
      </div>

      <div className="panel-foot">
        <span>{rows.length} / {s.net.length} sockets</span>
        <div className="spacer" />
        <span>HTTP bodies need an on-device proxy + CA cert</span>
      </div>
    </>
  );
}
