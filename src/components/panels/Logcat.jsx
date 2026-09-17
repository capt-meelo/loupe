import React, { useMemo, useEffect, useRef } from 'react';
import { useLoupe } from '../../store.jsx';
import { Chip, Search, AppSelect } from '../ui.jsx';

const LEVELS = ['V', 'D', 'I', 'W', 'E', 'F'];
const LEVEL_NAMES = { V: 'Verbose', D: 'Debug', I: 'Info', W: 'Warn', E: 'Error', F: 'Fatal' };
const COLORS = { V: 'var(--lv)', D: 'var(--ld)', I: 'var(--li)', W: 'var(--lw)', E: 'var(--le)', F: 'var(--lf)' };
const levelColor = (l) => COLORS[l] || 'var(--ink2)';

const fmtTime = (ts) => {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

export function filterLogs(s) {
  const q = s.logQ.toLowerCase();
  const pids = s.logApp ? new Set(s.logAppPids) : null;   // filter to the picked app's processes
  return s.logs.filter((l) => {
    if (!s.levels[l.level]) return false;
    if (pids && !pids.has(l.pid)) return false;
    if (q && !(l.tag + ' ' + l.msg).toLowerCase().includes(q)) return false;
    return true;
  });
}

// Only the newest slice is put in the DOM; thousands of rows is what made the
// app crawl after a few minutes of streaming.
const MAX_DOM_ROWS = 400;

export function Logcat() {
  const { s, set, update, toast, download, setLogApp } = useLoupe();
  const all = useMemo(
    () => filterLogs(s),
    [s.logs, s.levels, s.logQ, s.logApp, s.logAppPids]
  );
  const rows = all.length > MAX_DOM_ROWS ? all.slice(-MAX_DOM_ROWS) : all;
  const ref = useRef(null);

  useEffect(() => {
    if (!s.paused && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  });

  const exportLogs = () => {
    const text = all.map((l) => `${fmtTime(l.ts)} ${l.level}/${l.tag}(${l.pid}): ${l.msg}`).join('\n');
    download(new Blob([text], { type: 'text/plain' }), 'logcat.txt');
    toast(`Exported ${all.length} lines`);
  };

  return (
    <>
      <div className="panel-toolbar">
        {LEVELS.map((l) => (
          <button key={l} title={LEVEL_NAMES[l]} className="mono"
            onClick={() => update((st) => ({ levels: { ...st.levels, [l]: !st.levels[l] } }))}
            style={{
              width: 24, height: 24, display: 'grid', placeItems: 'center', borderRadius: 6,
              fontSize: 11, fontWeight: 600, flex: '0 0 auto',
              color: s.levels[l] ? levelColor(l) : 'var(--ink3)',
              border: '1px solid ' + (s.levels[l] ? levelColor(l) : 'var(--line)'),
              opacity: s.levels[l] ? 1 : 0.5
            }}>{l}</button>
        ))}
        <div className="vrule" style={{ height: 20, margin: '0 3px' }} />
        <Search value={s.logQ} onChange={(e) => set({ logQ: e.target.value })} placeholder="filter tag or message…" />
        <AppSelect apps={s.apps} appIcons={s.appIcons} value={s.logApp} allowAll placeholder="All apps"
          open={s.logAppOpen} onToggle={(v) => set({ logAppOpen: v })} onPick={setLogApp} />
        <Chip sans on={s.paused} onClick={() => set({ paused: !s.paused })}>{s.paused ? 'Resume' : 'Pause'}</Chip>
        <button className="btn-quiet" onClick={() => set({ logs: [] })}>Clear</button>
        <button className="btn-quiet" onClick={exportLogs}>Export</button>
      </div>

      <div ref={ref} className="scroll mono" style={{ flex: '1 1 auto', fontSize: 11.5, lineHeight: 1.65, padding: '6px 0' }}>
        {rows.length === 0 && (
          <div style={{ color: 'var(--ink3)', padding: '10px 12px' }}>
            {s.connected ? 'Waiting for logcat output…' : 'Connect a device to stream logcat.'}
          </div>
        )}
        {rows.map((l) => (
          <div key={l.id} style={{ display: 'flex', gap: 10, padding: '1px 11px', alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--ink3)', flex: '0 0 auto' }}>{fmtTime(l.ts)}</span>
            <span style={{ color: 'var(--ink3)', flex: '0 0 auto', width: 52 }}>{l.pid}</span>
            <span style={{ color: levelColor(l.level), fontWeight: 600, flex: '0 0 auto', width: 12 }}>{l.level}</span>
            <span style={{ color: 'var(--ink2)', flex: '0 0 auto', width: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {l.tag}
            </span>
            <span style={{ color: l.level === 'E' || l.level === 'F' ? 'var(--err)' : 'var(--ink)', flex: '1 1 auto', minWidth: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {l.msg}
            </span>
          </div>
        ))}
      </div>

      <div className="panel-foot">
        <span>
          {all.length} / {s.logs.length} lines
          {all.length > rows.length ? ` · showing last ${rows.length}` : ''}
          {s.paused ? ' · paused' : s.connected ? ' · streaming' : ''}
        </span>
      </div>
    </>
  );
}
