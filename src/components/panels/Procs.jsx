import React, { useEffect, useMemo } from 'react';
import { useLoupe } from '../../store.jsx';
import { Search, Mini, EmptyState, friendlyName } from '../ui.jsx';

// Column id → value to sort by. Numeric columns sort high→low by default.
const VALUE = {
  pid: (p) => p.pid,
  name: (p) => friendlyName(p.name).toLowerCase(),
  pkg: (p) => p.name.toLowerCase(),
  cpu: (p) => p.cpu,
  rss: (p) => p.rss
};
const NUMERIC = new Set(['pid', 'cpu', 'rss']);

/** Up/down sort arrows: both lit when the column is sortable-but-inactive, the
 *  chosen direction in accent when active. */
function Arrows({ active, dir }) {
  const up = active ? (dir === 'asc' ? 'var(--accent)' : 'var(--ink4,#3a3d44)') : 'var(--ink2)';
  const dn = active ? (dir === 'desc' ? 'var(--accent)' : 'var(--ink4,#3a3d44)') : 'var(--ink2)';
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 0.62, fontSize: 7 }}>
      <span style={{ color: up }}>▲</span>
      <span style={{ color: dn }}>▼</span>
    </span>
  );
}

function Head({ col, label, sort, dir, onSort, width, flex, right }) {
  return (
    <span onClick={() => onSort(col)} title="Sort"
      style={{
        width, flex: flex || (width ? '0 0 auto' : undefined), cursor: 'pointer', userSelect: 'none',
        display: 'flex', alignItems: 'center', gap: 3, justifyContent: right ? 'flex-end' : 'flex-start'
      }}>
      <Arrows active={sort === col} dir={dir} /><span>{label}</span>
    </span>
  );
}

export function Procs() {
  const { s, set, loadProcs, toast, runShell } = useLoupe();
  const dir = s.procDir || 'desc';

  useEffect(() => {
    if (s.connected && s.procs.length === 0 && !s.procsBusy) loadProcs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.connected]);

  const rows = useMemo(() => {
    const q = s.procQ.toLowerCase();
    const col = s.procSort || 'pid';
    let list = s.procs;
    if (q) list = list.filter((p) => (p.name + ' ' + friendlyName(p.name) + ' ' + p.pid).toLowerCase().includes(q));
    const val = VALUE[col] || VALUE.pid;
    return [...list].sort((a, b) => {
      const va = val(a), vb = val(b);
      const r = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return dir === 'asc' ? r : -r;
    });
  }, [s.procs, s.procQ, s.procSort, dir]);

  if (!s.connected) return <EmptyState>Connect a device to list running processes.</EmptyState>;

  const mb = (kb) => (kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB');

  // Click a column: toggle direction if active, else make it active with its
  // default (numbers high→low, text A→Z).
  const onSort = (col) => {
    if (s.procSort === col) set({ procDir: dir === 'asc' ? 'desc' : 'asc' });
    else set({ procSort: col, procDir: NUMERIC.has(col) ? 'desc' : 'asc' });
  };
  const sort = s.procSort || 'pid';

  return (
    <>
      <div className="panel-toolbar">
        <Search value={s.procQ} onChange={(e) => set({ procQ: e.target.value })} placeholder="process or pid…" grow="0 1 50%" />
        <div className="spacer" />
        <button className="btn-quiet" onClick={() => { set({ procs: [] }); loadProcs(); }}>Reload</button>
      </div>

      <div className="mono" style={{
        flex: '0 0 auto', display: 'flex', gap: 8, padding: '5px 10px',
        borderBottom: '1px solid var(--line)', fontSize: 10, color: 'var(--ink3)', letterSpacing: '0.04em'
      }}>
        <Head col="pid" label="PID" sort={sort} dir={dir} onSort={onSort} width={56} />
        <Head col="name" label="NAME" sort={sort} dir={dir} onSort={onSort} width={140} />
        <Head col="pkg" label="PACKAGE NAME" sort={sort} dir={dir} onSort={onSort} flex="1 1 auto" />
        <Head col="cpu" label="CPU" sort={sort} dir={dir} onSort={onSort} width={64} right />
        <Head col="rss" label="MEM" sort={sort} dir={dir} onSort={onSort} width={86} right />
        <span style={{ width: 120 }} />
      </div>

      <div className="scroll mono" style={{ flex: '1 1 auto', fontSize: 11.5 }}>
        {s.procsBusy && <div style={{ color: 'var(--ink3)', padding: '10px 12px' }}>Reading ps…</div>}
        {rows.map((p) => (
          <div key={p.pid} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderBottom: '1px solid var(--line)'
          }}>
            <span style={{ width: 56, color: 'var(--ink3)' }}>{p.pid}</span>
            <span style={{ width: 140, flex: '0 0 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={p.user}>{friendlyName(p.name)}</span>
            <span style={{ flex: '1 1 auto', minWidth: 0, color: 'var(--ink3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={p.name}>{p.name}</span>
            <span style={{
              width: 64, textAlign: 'right',
              color: p.cpu >= 20 ? 'var(--accent)' : p.cpu > 0 ? 'var(--ink2)' : 'var(--ink3)'
            }}>{p.cpu.toFixed(1)}%</span>
            <span style={{ width: 86, textAlign: 'right', color: 'var(--ink2)' }}>{mb(p.rss)}</span>
            <span style={{ width: 120, flex: '0 0 auto', display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              <Mini label="stop" onClick={() => { runShell(`am force-stop ${p.name}`); toast('force-stop ' + p.name); }} />
              <Mini tone="danger" label="kill" onClick={() => { runShell(`kill ${p.pid}`); toast('kill ' + p.pid); }} />
            </span>
          </div>
        ))}
      </div>

      <div className="panel-foot"><span>{rows.length} / {s.procs.length} processes</span></div>
    </>
  );
}
