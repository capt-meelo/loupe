import React from 'react';
import { useLoupe } from '../store.jsx';

const Shell = ({ title, children, actions, onClose }) => (
  <div role="dialog" aria-modal="true" aria-labelledby="ip-title" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'grid', placeItems: 'center', background: 'var(--overlay)' }}>
    <div style={{ width: 'min(460px, calc(100vw - 32px))', padding: 20, borderRadius: 12, background: 'var(--bg2)', border: '1px solid var(--line2)', boxShadow: 'var(--sh)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div id="ip-title" style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
      <div style={{ color: 'var(--ink2)', lineHeight: 1.6 }}>{children}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>{actions}</div>
    </div>
  </div>
);

/** Two ways Android can stop an install: Play Protect asking on the phone, or the OS refusing an old-target app. */
export function InstallPrompt() {
  const { s, set, installApk, installWithoutScan, cancelInstall } = useLoupe();
  const p = s.installPrompt;
  if (!p) return null;
  const close = () => set({ installPrompt: null });

  if (p.kind === 'playprotect') {
    return (
      <Shell title="Play Protect is asking on the phone" onClose={close} actions={<>
        <button className="btn" onClick={cancelInstall}>Cancel install</button>
        <button className="btn btn-accent" autoFocus onClick={() => installWithoutScan(p.file)}>Install anyway</button>
      </>}>
        The phone flagged <b style={{ color: 'var(--ink)' }}>{p.file.name}</b> as unsafe and is holding the install until someone answers its dialog.
        <b style={{ color: 'var(--ink)' }}> Install anyway</b> turns off Play Protect scanning for installs over adb
        (<span className="mono">verifier_verify_adb_installs</span>, a setting you can turn back on later) and installs again.
      </Shell>
    );
  }
  return (
    <Shell title="Android blocked this app" onClose={close} actions={<>
      <button className="btn" onClick={close}>Cancel</button>
      <button className="btn btn-accent" autoFocus onClick={() => installApk(p.file, { bypassSdk: true })}>Install anyway</button>
    </>}>
      <b style={{ color: 'var(--ink)' }}>{p.file.name}</b> was built for an older version of Android, so the phone refused to install it.
      Installing anyway retries with <span className="mono">--bypass-low-target-sdk-block</span>, which needs Android 14 or later.
      <pre className="mono" style={{ margin: '8px 0 0', padding: 8, borderRadius: 7, background: 'var(--bg3)', color: 'var(--ink3)', fontSize: 11, whiteSpace: 'pre-wrap', maxHeight: 90, overflow: 'auto' }}>{p.detail}</pre>
    </Shell>
  );
}

/** Replaces window.confirm: the same look as the install prompts. Opened with `ask({ title, body, yes, danger }, onYes)`. */
export function ConfirmDialog() {
  const { s, set } = useLoupe();
  const a = s.confirmAsk;
  if (!a) return null;
  const close = () => set({ confirmAsk: null });
  return (
    <Shell title={a.title} onClose={close} actions={<>
      <button className="btn" onClick={close}>Cancel</button>
      <button className="btn btn-accent" autoFocus
        style={a.danger ? { background: 'var(--err)', borderColor: 'var(--err)', color: '#fff' } : undefined}
        onClick={() => { close(); a.run(); }}>{a.yes || 'OK'}</button>
    </>}>{a.body}</Shell>
  );
}
