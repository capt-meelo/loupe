import React, { useEffect, useRef } from 'react';
import { useLoupe } from '../../store.jsx';
import { EmptyState, Mini } from '../ui.jsx';

const head = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  padding: '0 0 6px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
  color: 'var(--ink3)', borderBottom: '1px solid var(--line)', marginBottom: 8
};
const input = {
  fontSize: 12, padding: '5px 8px', background: 'var(--bg2)',
  border: '1px solid var(--line)', borderRadius: 6, color: 'var(--ink)'
};
const hint = { fontSize: 10.5, color: 'var(--ink3)', lineHeight: 1.6, margin: '8px 0 0' };
const badge = { textTransform: 'none', letterSpacing: 0, fontSize: 9.5 };

export function Proxy() {
  const { s, set, setDeviceProxy, clearDeviceProxy, refreshDeviceProxy, testProxy,
          installCert, removeCert, checkCert } = useLoupe();
  const certRef = useRef(null);

  useEffect(() => {
    if (s.connected) { refreshDeviceProxy(); checkCert(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.connected]);

  if (!s.connected) return <EmptyState>Connect a device to route its traffic through a proxy.</EmptyState>;

  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
      <div className="scroll" style={{ flex: '1 1 0', minWidth: 0, padding: 12, display: 'flex', flexDirection: 'column', gap: 16, borderRight: '1px solid var(--line)' }}>
      <section>
        <div style={head}>
          <span>Device proxy</span>
          <span className="mono" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 7, fontSize: 10,
            textTransform: 'none', letterSpacing: 0, flex: '0 0 auto',
            border: '1px solid ' + (s.devProxyLive ? 'var(--ok)' : 'var(--line)'),
            color: s.devProxyLive ? 'var(--ok)' : 'var(--ink3)'
          }}>
            <span className="dot" style={{
              width: 5, height: 5, background: s.devProxyLive ? 'var(--ok)' : 'var(--ink3)',
              animation: s.devProxyLive ? 'lpPulse 1.6s ease-in-out infinite' : 'none'
            }} />
            {s.devProxyLive ? `routing → ${s.devProxyLive}` : 'not routing'}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <input className="mono" list="loupe-proxy-hosts" value={s.devProxyHost}
            onChange={(e) => set({ devProxyHost: e.target.value })}
            placeholder={s.proxyHosts?.[0]?.address || 'proxy host / IP'}
            style={{ ...input, flex: '1 1 180px', minWidth: 140 }} />
          <datalist id="loupe-proxy-hosts">
            {(s.proxyHosts || []).map((h) => <option key={h.address} value={h.address}>{h.name}</option>)}
          </datalist>
          <input className="mono" value={s.devProxyPort} onChange={(e) => set({ devProxyPort: e.target.value })}
            placeholder="port" style={{ ...input, width: 74 }} />
          {s.devProxyLive
            ? <Mini tone="danger" label="Stop proxy" onClick={clearDeviceProxy} />
            : <Mini tone="accent" label="Start proxy" onClick={setDeviceProxy} />}
          <div className="spacer" />
          <Mini label="Test connection" onClick={testProxy} />
          <Mini label="Refresh" onClick={refreshDeviceProxy} />
        </div>
        <p className="mono" style={hint}>
          Point this at your intercepting proxy (Burp, HTTP Toolkit, …). It must listen on all
          interfaces so the phone can reach it, not only 127.0.0.1.
        </p>
      </section>

      <section>
        <div style={head}>
          <span>CA certificate</span>
          <span className="mono" style={{ ...badge, color: s.certInstalled ? 'var(--ok)' : 'var(--ink3)' }}>
            {s.certInstalled === true ? 'installed ✓' : s.certInstalled === false ? 'not installed' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <Mini tone="accent" disabled={s.certBusy || !s.rootAvailable}
            label={s.certBusy ? 'Installing…' : (s.certName ? `Reinstall ${s.certName}` : 'Install CA cert (.der / .pem)')}
            onClick={() => certRef.current?.click()} />
          <input ref={certRef} type="file" hidden accept=".der,.pem,.crt,.cer,application/x-x509-ca-cert"
            onChange={(e) => { installCert(e.target.files?.[0]); e.target.value = ''; }} />
          {s.certInstalled && <Mini tone="danger" label="Remove" onClick={removeCert} />}
        </div>
        <p className="mono" style={hint}>
          {s.rootAvailable
            ? 'Installs your proxy’s CA into the system trust store so HTTPS is decryptable. On a Magisk/KernelSU device it installs a boot module that survives reboots; otherwise it lasts until reboot. Export Burp’s cert from Proxy ▸ Import/export CA certificate ▸ DER.'
            : 'Root is required to install a system CA. On a non-rooted device, install the cert as a user cert from Settings (most apps will not trust it).'}
        </p>
      </section>
      </div>

      <div style={{ flex: '1 1 0', minWidth: 0, padding: 12, display: 'flex', flexDirection: 'column' }}>
        <div style={head}><span>Log</span></div>
        <div className="scroll mono" style={{ flex: '1 1 auto', minHeight: 0, fontSize: 11, lineHeight: 1.7, color: 'var(--ink2)' }}>
          {s.proxyLog.length === 0
            ? <span style={{ color: 'var(--ink3)' }}>Proxy and certificate steps show here.</span>
            : s.proxyLog.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}
