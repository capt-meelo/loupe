import React, { useEffect, useMemo } from 'react';
import { useLoupe } from '../../store.jsx';
import { Search, Mini, EmptyState } from '../ui.jsx';

/** Memory snapshots and heap dumps for a chosen process. */
export function Memory() {
  const { s, set, loadProcs, memSnapshot, memMaps, dumpHeap, dumpMemory, saveMemText } = useLoupe();

  useEffect(() => {
    if (s.connected && s.procs.length === 0 && !s.procsBusy) loadProcs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.connected]);

  const rows = useMemo(() => {
    const q = s.memQ.toLowerCase();
    const list = q ? s.procs.filter((p) => (p.name + ' ' + p.pid).toLowerCase().includes(q)) : s.procs;
    return [...list].sort((a, b) => b.rss - a.rss);
  }, [s.procs, s.memQ]);

  if (!s.connected) return <EmptyState>Connect a device to snapshot memory.</EmptyState>;

  const sel = s.procs.find((p) => p.pid === s.memPid);
  const mb = (kb) => (kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB');

  return (
    <>
      <div className="panel-toolbar">
        <Search value={s.memQ} onChange={(e) => set({ memQ: e.target.value })} placeholder="filter process or pid…" grow="0 1 50%" />
        <div className="spacer" />
        {sel && (
          <>
            <Mini label="Snapshot (meminfo)" onClick={() => memSnapshot(sel.pid, sel.name)} />
            <Mini label="Maps" onClick={() => memMaps(sel.pid)} />
            <Mini tone="accent" label="Capture memory → PC" onClick={() => dumpHeap(sel.pid, sel.name)}
              title="hprof if the app is debuggable, otherwise an ELF core (needs root)" />
          </>
        )}
        <button className="btn-quiet" onClick={() => { set({ procs: [] }); loadProcs(); }}>Reload</button>
      </div>

      {sel && s.rootMode && (
        <div className="panel-toolbar" style={{ borderTop: 'none' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--warn)' }}># root</span>
          <span className="label">ELF core dump</span>
          <div className="field" style={{ flex: '1 1 150px', minWidth: 120 }}>
            <input value={s.memRegionQ} onChange={(e) => set({ memRegionQ: e.target.value })}
              placeholder="filter regions (e.g. dalvik, libxul, heap)…" />
          </div>
          <span className="label">cap</span>
          <input className="mono" value={s.memCapMB} inputMode="numeric"
            onChange={(e) => set({ memCapMB: Number(e.target.value.replace(/\D/g, '')) || 0 })}
            style={{
              width: 52, textAlign: 'right', fontSize: 11, padding: '4px 6px',
              border: '1px solid var(--line)', borderRadius: 7, background: 'var(--bg2)'
            }} />
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>MB</span>
          <Mini tone="danger" label={s.memBusy ? 'Dumping…' : 'Force core dump'}
            disabled={s.memBusy} onClick={() => dumpMemory(sel.pid, sel.name)} />
        </div>
      )}

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateRows: 'minmax(0,1fr)', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.35fr)' }}>
        <div className="scroll mono" style={{ borderRight: '1px solid var(--line)', fontSize: 11.5 }}>
          {s.procsBusy && <div style={{ color: 'var(--ink3)', padding: '10px 12px' }}>Reading ps…</div>}
          {rows.map((p) => (
            <div key={p.pid} className={'file-row' + (s.memPid === p.pid ? ' on' : '')}
              onClick={() => { set({ memPid: p.pid }); memSnapshot(p.pid, p.name); }}>
              <span style={{ width: 56, color: 'var(--ink3)' }}>{p.pid}</span>
              <span style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
              <span style={{ width: 76, textAlign: 'right', color: 'var(--ink2)' }}>{mb(p.rss)}</span>
            </div>
          ))}
        </div>

        <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="preview-head mono">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.memLabel || (sel ? `${sel.name} (${sel.pid})` : 'No process selected')}
            </span>
            <div className="spacer" />
            {s.memText && <Mini label="Save .txt" onClick={saveMemText} />}
          </div>

          {s.memBusy && !s.memText ? (
            <div className="mono preview-note">Working…</div>
          ) : s.memText ? (
            <pre className="scroll mono" style={{
              flex: '1 1 auto', margin: 0, padding: '9px 11px', fontSize: 10.5,
              lineHeight: 1.6, whiteSpace: 'pre', overflow: 'auto'
            }}>{s.memText}</pre>
          ) : (
            <div className="mono preview-note">
              Pick a process: its <span style={{ color: 'var(--ink2)' }}>meminfo</span> loads
              automatically. Then use <span style={{ color: 'var(--ink2)' }}>Maps</span> for its
              address space, or <span style={{ color: 'var(--ink2)' }}>Capture memory</span> to
              pull a dump to your PC.
              <br /><br />
              Capture picks whatever works: an <span style={{ color: 'var(--ink2)' }}>.hprof</span>
              when the app is debuggable, otherwise it falls back automatically to an
              <span style={{ color: 'var(--ink2)' }}> ELF core</span> read from
              /proc/&lt;pid&gt;/mem (needs root): which opens in gdb, radare2 or Ghidra.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
