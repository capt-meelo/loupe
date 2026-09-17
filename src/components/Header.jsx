import React from 'react';
import { useLoupe } from '../store.jsx';
import { Icon, useDismiss } from './ui.jsx';
import { Wireless } from './Wireless.jsx';
import { version } from '../../package.json';

// Magnifier inspecting an Android phone. Matches assets/logo.svg (the README banner).
const Logo = () => (
  <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--accentFill)', display: 'grid', placeItems: 'center' }}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="9.5" cy="9.5" r="8" stroke="var(--accentInk)" strokeWidth="1.5" />
      <path d="M15.2 15.2L21.5 21.5" stroke="var(--accentInk)" strokeWidth="2.4" strokeLinecap="round" />
      {/* phone */}
      <rect x="6.1" y="4" width="6.8" height="11" rx="1.6" stroke="var(--accentInk)" strokeWidth="1" />
      {/* Android head, centered on the screen */}
      <g fill="var(--accentInk)">
        <path d="M8 9.2L7.6 8.4M11 9.2L11.4 8.4" stroke="var(--accentInk)" strokeWidth="0.7" strokeLinecap="round" />
        <path d="M7 11.5v-0.3a2.5 2.5 0 0 1 5 0v0.3z" />
        <circle cx="8.5" cy="10.3" r="0.38" fill="var(--accentFill)" />
        <circle cx="10.5" cy="10.3" r="0.38" fill="var(--accentFill)" />
      </g>
    </svg>
  </div>
);

function DevicePicker() {
  const { s, set, connectUsb, disconnectDevice } = useLoupe();
  const close = () => set({ devOpen: false });
  const ref = useDismiss(s.devOpen, close);
  const dev = s.device;

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="btn btn-pick" onClick={() => set({ devOpen: !s.devOpen })}
        title={dev ? `${dev.kind === 'wifi' ? 'Wi-Fi' : 'WebUSB'} · authorized` : 'No device connected'}>
        <span className={'dot' + (dev ? ' pulse' : '')} style={{ background: dev ? 'var(--ok)' : 'var(--ink3)' }} />
        <span style={{ fontWeight: 500, color: dev ? 'var(--ink)' : 'var(--ink2)' }}>
          {dev ? dev.model : 'No device'}
        </span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink2)' }}>
          {dev ? dev.serial : 'connect one'}
        </span>
        {dev && (
          <span className="mono" style={{ fontSize: 10, color: 'var(--ok)' }}>
            {dev.kind === 'wifi' ? 'wi-fi' : 'usb'}
          </span>
        )}
        <span style={{ color: 'var(--ink3)', fontSize: 9 }}>▼</span>
      </button>

      {s.devOpen && (
        <div className="menu" style={{ width: 330, maxHeight: 560, overflow: 'auto' }}>
          <div className="label" style={{ padding: '6px 8px' }}>Connected</div>

          {dev ? (
            <div className="menu-item on" style={{ cursor: 'default' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start', minWidth: 0 }}>
                <span style={{ fontWeight: 500 }}>{dev.model}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>
                  {dev.kind === 'wifi' ? '📶' : '🔌'} {dev.serial}
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, flex: '0 0 auto' }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ok)' }}>
                  {dev.kind === 'wifi' ? 'wi-fi' : 'usb'}
                </span>
                <button className="btn-quiet" style={{ color: 'var(--err)', fontSize: 11, fontWeight: 600 }}
                  onClick={() => { close(); disconnectDevice(); }}>
                  Disconnect
                </button>
              </span>
            </div>
          ) : (
            <div className="menu-note" style={{ padding: '2px 8px 8px' }}>No devices. Connect one below.</div>
          )}

          <div className="menu-sep" />
          <button
            className="menu-item"
            style={{ color: 'var(--accent)', fontWeight: 500, justifyContent: 'flex-start' }}
            onClick={connectUsb}
          >
            {s.usbSupported ? '+ Connect a device over USB' : 'USB needs Chrome or Edge'}
          </button>
          <div className="menu-sep" />
          {s.wifiOpen ? <Wireless /> : (
            <button
              className="menu-item"
              style={{ color: 'var(--accent)', fontWeight: 500, justifyContent: 'flex-start' }}
              onClick={() => set({ wifiOpen: true })}
            >
              + Connect over Wi-Fi (pair code or QR)
            </button>
          )}
        </div>
      )}
    </div>
  );
}


function RebootMenu() {
  const { s, set, reboot } = useLoupe();
  const close = () => set({ rebootOpen: false });
  const ref = useDismiss(s.rebootOpen, close);
  const pick = (mode) => { close(); reboot(mode); };
  const OPTS = [['', 'System'], ['recovery', 'Recovery'], ['bootloader', 'Bootloader']];

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="btn" title="Reboot the device" onClick={() => set({ rebootOpen: !s.rebootOpen })}>
        <Icon size={14} d="M13 8a5 5 0 1 1-1.7-3.8 M13 2v3h-3" />
        Reboot
        <span style={{ color: 'var(--ink3)', fontSize: 9 }}>▼</span>
      </button>
      {s.rebootOpen && (
        <div className="menu" style={{ width: 170 }}>
          {OPTS.map(([mode, label]) => (
            <button key={label} className="menu-item" style={{ justifyContent: 'flex-start' }}
              onClick={() => pick(mode)}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { s, toggleTheme, toast, loadProcs, loadApps, loadFiles, toggleRoot,
          disconnectDevice } = useLoupe();

  const refresh = () => {
    if (!s.connected) { toast('No device connected'); return; }
    loadProcs(); loadApps(s.appFilter); loadFiles(s.path);
    toast('Refreshed');
  };

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Logo />
        <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px' }}>Loupe</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 5, padding: '2px 5px' }}>
          {version}
        </div>
      </div>

      <div className="vrule" />
      <DevicePicker />
      <div className="spacer" />

      <button
        className="btn"
        title={s.rootMode ? 'Elevated: commands run through su' : 'Run commands through su'}
        disabled={!s.connected || s.rootBusy}
        onClick={toggleRoot}
        style={{
          borderColor: s.rootMode ? 'var(--warn)' : undefined,
          color: s.rootMode ? 'var(--warn)' : undefined
        }}
      >
        <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
          {s.rootBusy ? '…' : s.rootMode ? '# root' : '$ shell'}
        </span>
      </button>

      <button className="btn" onClick={refresh}>
        <Icon size={14} d="M13 8a5 5 0 1 1-1.7-3.8 M13 2v3h-3" />
        Refresh
      </button>

      {s.connected && <RebootMenu />}

      {s.connected && (
        <button
          className="btn"
          title={`Disconnect ${s.device?.serial || 'device'}`}
          onClick={disconnectDevice}
          style={{ borderColor: 'var(--err)', color: 'var(--err)' }}
        >
          <Icon size={14} d="M6 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2 M10.5 8H14 M12 6l2 2-2 2" />
          Disconnect
        </button>
      )}

      <button className="btn-icon" title="Toggle theme" onClick={toggleTheme}>
        <Icon>
          <circle cx="8" cy="8" r="3.4" />
          <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.1 3.1l1.1 1.1M11.8 11.8l1.1 1.1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1" />
        </Icon>
      </button>
    </header>
  );
}
