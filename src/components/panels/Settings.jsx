import React, { useEffect, useMemo } from 'react';
import { useLoupe } from '../../store.jsx';
import { Chip, Search, Mini, EmptyState } from '../ui.jsx';

const NS = ['system', 'secure', 'global'];

const editInput = {
  minHeight: 90, resize: 'vertical', fontSize: 12, padding: 8, lineHeight: 1.5,
  background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--ink)'
};

/** Browse and edit the system / secure / global settings namespaces. */
export function Settings() {
  const { s, set, loadSettings, putSetting, deleteSetting } = useLoupe();

  useEffect(() => {
    if (s.connected && s.settings.length === 0 && !s.settingsBusy) loadSettings(s.settingsNs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.connected]);

  const rows = useMemo(() => {
    const q = s.settingsQ.toLowerCase();
    return q ? s.settings.filter((r) => (r.k + ' ' + r.v).toLowerCase().includes(q)) : s.settings;
  }, [s.settings, s.settingsQ]);

  if (!s.connected) return <EmptyState>Connect a device to view and edit settings.</EmptyState>;

  const sel = s.settings.find((r) => r.k === s.settingsSel);
  const reload = () => { set({ settings: [] }); loadSettings(s.settingsNs); };

  return (
    <>
      <div className="panel-toolbar">
        <Search value={s.settingsQ} onChange={(e) => set({ settingsQ: e.target.value })} placeholder="key or value…" grow="0 1 50%" />
        {NS.map((ns) => (
          <Chip key={ns} on={s.settingsNs === ns} onClick={() => { set({ settings: [] }); loadSettings(ns); }}>{ns}</Chip>
        ))}
        <div className="spacer" style={{ minWidth: 8 }} />
        <button className="btn-quiet" onClick={reload}>Reload</button>
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateRows: 'minmax(0,1fr)', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)' }}>
        <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)' }}>
          <div className="scroll" style={{ flex: '1 1 auto' }}>
            {s.settingsBusy && <div className="mono" style={{ color: 'var(--ink3)', padding: '10px 12px' }}>Reading settings…</div>}
            {rows.map((r) => (
              <div key={r.k} className={'list-row' + (s.settingsSel === r.k ? ' on' : '')}
                style={{ gap: 8, alignItems: 'baseline' }}
                onClick={() => set({ settingsSel: r.k, settingsVal: r.v })}>
                <span className="mono" style={{ fontSize: 11, flex: '0 0 auto', maxWidth: '52%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.k}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink3)', flex: '1 1 auto', minWidth: 0, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.v}</span>
              </div>
            ))}
          </div>
          <div className="panel-foot"><span>{rows.length} / {s.settings.length} · {s.settingsNs}</span></div>
        </div>

        <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {!sel ? (
            <div className="mono preview-note">Select a key to edit its value.</div>
          ) : (
            <div className="scroll" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink3)' }}>
                {s.settingsNs} / <span style={{ color: 'var(--ink)' }}>{sel.k}</span>
              </div>
              <textarea className="mono" value={s.settingsVal} spellCheck={false}
                onChange={(e) => set({ settingsVal: e.target.value })} style={editInput} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Mini tone="accent" label="Set" onClick={() => putSetting(s.settingsNs, sel.k, s.settingsVal)} />
                <Mini tone="danger" label="Delete"
                  onClick={() => { if (window.confirm(`Delete ${s.settingsNs}/${sel.k}?`)) deleteSetting(s.settingsNs, sel.k); }} />
              </div>
              <p className="mono" style={{ fontSize: 10.5, color: 'var(--ink3)', lineHeight: 1.6, margin: 0 }}>
                Writes go through <span style={{ color: 'var(--ink2)' }}>settings put {s.settingsNs}</span>.
                Some secure/global keys are protected and may reject a change.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
