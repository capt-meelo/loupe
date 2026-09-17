import React, { useEffect, useMemo } from 'react';
import { useLoupe } from '../store.jsx';
import { Mini, Tab } from './ui.jsx';
import qrcode from 'qrcode-generator';

/** Renders the pairing payload as a scannable QR. */
function QrImage({ payload }) {
  const svg = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(payload);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 1, scalable: true });
  }, [payload]);

  return (
    <div
      style={{ width: 176, height: 176, background: '#fff', borderRadius: 8, padding: 8 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

const TABS = [
  { id: 'code', label: 'Pair code' },
  { id: 'qr', label: 'QR code' },
  { id: 'connect', label: 'Connect' }
];

export function Wireless() {
  const {
    s, set, refreshWireless, pairWithCode, connectWifiAddr,
    useWirelessDevice, startQr, cancelQr, killAdbServer
  } = useLoupe();

  useEffect(() => { refreshWireless(); /* eslint-disable-next-line */ }, []);

  return (
    <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {TABS.map((t) => (
          <Tab key={t.id} on={s.wifiTab === t.id} label={t.label}
            onClick={() => (t.id === 'qr' ? startQr() : set({ wifiTab: t.id }))} />
        ))}
      </div>

      {s.wifiTab === 'code' && (
        <>
          <div className="menu-note" style={{ padding: 0 }}>
            On the phone: <span style={{ color: 'var(--ink2)' }}>Wireless debugging → Pair device
            with pairing code</span>. Enter the address and code it shows.
          </div>
          <div className="field">
            <input value={s.pairAddr} placeholder="192.168.1.42:37013"
              onChange={(e) => set({ pairAddr: e.target.value })} />
          </div>
          <div className="field">
            <input className="mono" value={s.pairCode} inputMode="numeric" maxLength={6}
              placeholder="6-digit code" style={{ letterSpacing: '0.3em' }}
              onChange={(e) => set({ pairCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              onKeyDown={(e) => { if (e.key === 'Enter') pairWithCode(); }} />
            <button onClick={pairWithCode} disabled={s.wifiBusy}
              style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
              {s.wifiBusy ? '…' : 'Pair'}
            </button>
          </div>
        </>
      )}

      {s.wifiTab === 'qr' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {s.qr ? (
            <>
              <QrImage payload={s.qr.payload} />
              <div className="menu-note" style={{ padding: 0, textAlign: 'center' }}>
                On the phone: <span style={{ color: 'var(--ink2)' }}>Wireless debugging → Pair
                device with QR code</span>, then scan this.
              </div>
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink3)' }}>{s.qr.name}</span>
              <Mini label="Cancel" onClick={cancelQr} />
            </>
          ) : (
            <Mini tone="accent" label="Generate QR" onClick={startQr} />
          )}
        </div>
      )}

      {s.wifiTab === 'connect' && (
        <>
          <div className="menu-note" style={{ padding: 0 }}>
            Already paired? Connect straight to its address.
          </div>
          <div className="field">
            <input value={s.connectAddr} placeholder="192.168.1.42:5555"
              onChange={(e) => set({ connectAddr: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') connectWifiAddr(); }} />
            <button onClick={connectWifiAddr} disabled={s.wifiBusy}
              style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Connect</button>
          </div>
        </>
      )}

      {s.wifiDevices.length > 0 && (
        <>
          <div className="menu-sep" />
          <div className="label" style={{ padding: '0 2px' }}>Wireless devices</div>
          {s.wifiDevices.map((d) => (
            <button key={d.serial} className="menu-item" onClick={() => useWirelessDevice(d.serial)}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 500 }}>{d.model || d.serial}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>📶 {d.serial}</span>
              </span>
              <span className="mono" style={{ fontSize: 10, color: d.state === 'device' ? 'var(--ok)' : 'var(--warn)' }}>
                {d.state}
              </span>
            </button>
          ))}
        </>
      )}

      {s.wifiLog.length > 0 && (
        <pre className="mono" style={{
          margin: 0, padding: '6px 8px', maxHeight: 120, overflow: 'auto',
          fontSize: 10, lineHeight: 1.6, color: 'var(--ink3)',
          background: 'var(--bg3)', borderRadius: 7, whiteSpace: 'pre-wrap'
        }}>{s.wifiLog.join('\n')}</pre>
      )}

      <div className="menu-note" style={{ padding: 0 }}>
        Wireless uses the host <span className="mono">adb</span> via Loupe's bridge. That server
        also claims USB devices, so USB (WebUSB) and Wi-Fi can't be used at once.
      </div>
      <Mini label="Stop adb server (free USB)" onClick={killAdbServer} />
    </div>
  );
}
