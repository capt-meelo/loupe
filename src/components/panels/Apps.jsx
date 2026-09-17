import React, { useEffect, useMemo, useRef } from 'react';
import { useLoupe } from '../../store.jsx';
import { Chip, Search, Mini, EmptyState, friendlyName } from '../ui.jsx';

const FILTERS = [
  { id: 'user', label: 'user' }, { id: 'system', label: 'system' }, { id: 'all', label: 'all' }
];

// Real app icons live in APK resources ADB can't extract without pulling every
// APK, so this is a lightweight stand-in: the app's initial in a colour keyed to
// the package, so each app has a stable visual marker to scan for.
function AppBadge({ pkg, name }) {
  const letter = (name || pkg).replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase() || '?';
  let h = 0;
  for (let i = 0; i < pkg.length; i++) h = (h * 31 + pkg.charCodeAt(i)) % 360;
  return (
    <span style={{
      flex: '0 0 auto', width: 20, height: 20, borderRadius: 5, display: 'grid', placeItems: 'center',
      fontSize: 11, fontWeight: 700, color: '#0a0b0d', background: `hsl(${h} 52% 62%)`
    }}>{letter}</span>
  );
}

/** Right-hand detail for the selected package, from `dumpsys package`. */
function AppInfo() {
  const { s, browseTo, clearAppData, clearAppCache, setAppEnabled } = useLoupe();

  if (!s.appSel) return <div className="mono preview-note">Select an app to see its details.</div>;
  if (s.appInfoBusy) return <div className="mono preview-note">Reading dumpsys package…</div>;
  if (!s.appInfo) return <div className="mono preview-note">No details available.</div>;

  const i = s.appInfo;
  const rows = [
    { k: 'package', v: s.appSel },
    { k: 'version', v: i.versionName || '—' },
    { k: 'versionCode', v: i.versionCode || '—' },
    { k: 'minSdk', v: i.minSdk || '—' },
    { k: 'targetSdk', v: i.targetSdk || '—' },
    { k: 'userId', v: i.userId || '—' },
    { k: 'dataDir', v: i.dataDir || '—' },
    { k: 'apk', v: i.apk || '—' },
    { k: 'installed', v: i.firstInstall || '—' },
    { k: 'updated', v: i.lastUpdate || '—' }
  ];

  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="preview-head mono">
        <span style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.appSel}</span>
        <span style={{ flex: '0 0 auto', display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
          {i.dataDir && i.dataDir !== '—' && (
            <Mini label="data dir" title="Open the data dir in Files" onClick={() => browseTo(i.dataDir)} />
          )}
          <Mini label={i.enabled ? 'disable' : 'enable'}
            onClick={() => {
              if (i.enabled) { if (window.confirm(`Disable ${s.appSel}?`)) setAppEnabled(s.appSel, false); }
              else setAppEnabled(s.appSel, true);
            }} />
          <Mini label="clear cache" onClick={() => clearAppCache(s.appSel)} />
          <Mini tone="danger" label="clear data"
            onClick={() => { if (window.confirm(`Clear all data for ${s.appSel}? This cannot be undone.`)) clearAppData(s.appSel); }} />
        </span>
      </div>

      <div className="scroll mono" style={{ flex: '1 1 auto', padding: '9px 11px', fontSize: 11, lineHeight: 1.8 }}>
        {rows.map((r) => (
          <div key={r.k} style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--ink3)', flex: '0 0 92px' }}>{r.k}</span>
            <span style={{ flex: '1 1 auto', minWidth: 0, wordBreak: 'break-all' }}>{r.v}</span>
          </div>
        ))}

        {i.permissions?.length > 0 && (
          <>
            <div style={{ marginTop: 12, color: 'var(--ink3)' }}>
              permissions ({i.permissions.length})
            </div>
            {i.permissions.map((p) => (
              <div key={p} style={{ color: 'var(--ink2)', wordBreak: 'break-all' }}>{p}</div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function Apps() {
  const { s, set, loadApps, toast, runShell, showAppInfo, installApk, uninstallApp } = useLoupe();
  const apkRef = useRef(null);

  useEffect(() => {
    if (s.connected && s.apps.length === 0 && !s.appsBusy) loadApps(s.appFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.connected]);

  const rows = useMemo(() => {
    const q = s.appQ.toLowerCase();
    const list = q ? s.apps.filter((p) => (p + ' ' + friendlyName(p)).toLowerCase().includes(q)) : s.apps;
    return [...list].sort((a, b) => (friendlyName(a) || a).localeCompare(friendlyName(b) || b));
  }, [s.apps, s.appQ]);

  if (!s.connected) return <EmptyState>Connect a device to list installed packages.</EmptyState>;

  const pick = (id) => { set({ appFilter: id, apps: [], appSel: null, appInfo: null }); loadApps(id); };

  return (
    <>
      <div className="panel-toolbar">
        <Search value={s.appQ} onChange={(e) => set({ appQ: e.target.value })} placeholder="package or app name…" grow="0 1 50%" />
        {FILTERS.map((f) => (
          <Chip key={f.id} on={s.appFilter === f.id} onClick={() => pick(f.id)}>{f.label}</Chip>
        ))}
        <div className="spacer" style={{ minWidth: 8 }} />
        <Mini label={s.installBusy ? 'Installing…' : 'Install APK'} tone="accent"
          disabled={s.installBusy} onClick={() => apkRef.current?.click()} />
        <input ref={apkRef} type="file" accept=".apk,application/vnd.android.package-archive" hidden
          onChange={(e) => { installApk(e.target.files?.[0]); e.target.value = ''; }} />
        <button className="btn-quiet" onClick={() => { set({ apps: [] }); loadApps(s.appFilter); }}>Reload</button>
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateRows: 'minmax(0,1fr)', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)' }}>
        <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)' }}>
          <div className="scroll" style={{ flex: '1 1 auto' }}>
            {s.appsBusy && <div className="mono" style={{ color: 'var(--ink3)', padding: '10px 12px' }}>Listing packages…</div>}
            {rows.map((pkg) => {
              const name = friendlyName(pkg);
              return (
              <div key={pkg} className={'list-row' + (s.appSel === pkg ? ' on' : '')}
                style={{ gap: 8, alignItems: 'center' }} onClick={() => showAppInfo(pkg)}>
                {s.appIcons[pkg]
                  ? <img src={s.appIcons[pkg]} width={20} height={20} alt=""
                      style={{ flex: '0 0 auto', borderRadius: 5, objectFit: 'cover' }} />
                  : <AppBadge pkg={pkg} name={name} />}
                <span style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8, overflow: 'hidden' }}>
                  {name && <span style={{ fontSize: 11.5, flex: '0 1 auto', maxWidth: '46%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>}
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink3)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pkg}</span>
                </span>
                <span style={{ display: 'flex', gap: 4, flex: '0 0 auto' }}>
                  <Mini label="launch" onClick={(e) => {
                    e.stopPropagation();
                    runShell(`monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`);
                    toast('launch ' + pkg);
                  }} />
                  <Mini label="stop" onClick={(e) => {
                    e.stopPropagation();
                    runShell(`am force-stop ${pkg}`);
                    toast('force-stop ' + pkg);
                  }} />
                  <Mini tone="danger" label="uninstall" onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Uninstall ${pkg}?`)) uninstallApp(pkg);
                  }} />
                </span>
              </div>
              );
            })}
          </div>
          <div className="panel-foot"><span>{rows.length} / {s.apps.length} packages · {s.appFilter}</span></div>
        </div>

        <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <AppInfo />
        </div>
      </div>
    </>
  );
}
