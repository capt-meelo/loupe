import React from 'react';
import { useLoupe } from '../store.jsx';
import { Icon, useDismiss } from './ui.jsx';
import { Wireless } from './Wireless.jsx';

// Magnifier inspecting the Android head, with the "Loupe" wordmark (Poppins Bold, SIL OFL, as outlines so no font is needed).
const Logo = () => (
  <svg height="34" viewBox="370 130 1165 395" role="img" aria-label="Loupe" style={{ display: 'block' }}>
    <g stroke="var(--accentFill)" strokeLinecap="round" fill="none">
      <circle cx="539" cy="300" r="143" strokeWidth="38" />
      <path d="M640 404L730 498" strokeWidth="44" />
      <path d="M490 262L478 242M587 262L599 242" strokeWidth="9" />
    </g>
    <path fill="var(--accentFill)" fillRule="evenodd" d="M451 348a88 88 0 0 1 176 0zM492 313a10 10 0 1 0 20 0a10 10 0 1 0-20 0zM566 313a10 10 0 1 0 20 0a10 10 0 1 0-20 0z" />
    <rect x="788" y="393" width="421" height="21" rx="10.5" fill="var(--accentFill)" />
    <path fill="var(--ink)" d="M843.5 321.5H896.9V353H802.8V185.7H843.5ZM908.3 286.5Q908.3 266 917.4 250.4Q926.5 234.8 942.2 226.5Q957.9 218.1 977.4 218.1Q997 218.1 1012.7 226.5Q1028.4 234.8 1037.5 250.4Q1046.6 266 1046.6 286.5Q1046.6 307 1037.4 322.6Q1028.2 338.2 1012.4 346.6Q996.5 354.9 977 354.9Q957.4 354.9 941.8 346.6Q926.2 338.2 917.3 322.7Q908.3 307.2 908.3 286.5ZM1005.1 286.5Q1005.1 270.5 997.1 262Q989.1 253.4 977.4 253.4Q965.5 253.4 957.7 261.9Q949.8 270.3 949.8 286.5Q949.8 302.5 957.5 311.1Q965.3 319.6 977 319.6Q988.6 319.6 996.9 311.1Q1005.1 302.5 1005.1 286.5ZM1199.5 220V353H1158.8V334.9Q1152.6 343.7 1142 349.1Q1131.4 354.4 1118.5 354.4Q1103.3 354.4 1091.6 347.6Q1079.9 340.8 1073.5 328Q1067 315.1 1067 297.7V220H1107.6V292.2Q1107.6 305.6 1114.5 313Q1121.4 320.4 1133.1 320.4Q1145 320.4 1151.9 313Q1158.8 305.6 1158.8 292.2V220ZM1310.6 218.1Q1327 218.1 1340.4 226.5Q1353.7 234.8 1361.5 250.3Q1369.2 265.8 1369.2 286.3Q1369.2 306.8 1361.5 322.4Q1353.7 338 1340.4 346.4Q1327 354.9 1310.6 354.9Q1296.8 354.9 1286.2 349.2Q1275.6 343.5 1269.6 334.4V416.4H1228.9V220H1269.6V238.9Q1275.6 229.6 1286 223.8Q1296.5 218.1 1310.6 218.1ZM1298.4 253.6Q1286.3 253.6 1277.8 262.4Q1269.4 271.3 1269.4 286.5Q1269.4 301.8 1277.8 310.6Q1286.3 319.4 1298.4 319.4Q1310.6 319.4 1319.2 310.5Q1327.7 301.5 1327.7 286.3Q1327.7 271 1319.3 262.3Q1310.8 253.6 1298.4 253.6ZM1515.3 296.3H1423.1Q1424 308.7 1431 315.2Q1438.1 321.8 1448.3 321.8Q1463.6 321.8 1469.5 308.9H1512.9Q1509.6 322 1500.9 332.5Q1492.2 343 1479.1 348.9Q1466 354.9 1449.8 354.9Q1430.2 354.9 1415 346.6Q1399.7 338.2 1391.1 322.7Q1382.6 307.2 1382.6 286.5Q1382.6 265.8 1391 250.3Q1399.5 234.8 1414.7 226.5Q1430 218.1 1449.8 218.1Q1469.1 218.1 1484.1 226.2Q1499.1 234.3 1507.5 249.3Q1516 264.4 1516 284.4Q1516 290.1 1515.3 296.3ZM1474.3 273.6Q1474.3 263.2 1467.1 257Q1460 250.8 1449.3 250.8Q1439 250.8 1432 256.7Q1425 262.7 1423.3 273.6Z" />
  </svg>
);

function DevicePicker() {
  const { s, set, connectUsb, disconnectDevice, killAdbServer } = useLoupe();
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
        <div className="menu" style={{ width: s.wifiOpen ? 330 : 260, maxHeight: 560, overflow: 'auto' }}>
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
            {s.usbSupported ? '+ Connect over USB' : 'USB needs Chrome or Edge'}
          </button>
          <div className="menu-sep" />
          <button
            className="menu-item"
            style={{ color: 'var(--accent)', fontWeight: 500, justifyContent: 'flex-start' }}
            onClick={() => set({ wifiOpen: !s.wifiOpen })}
          >
            + Connect over Wi-Fi
          </button>
          {s.wifiOpen && <Wireless />}

          <div className="menu-sep" />
          <button
            className="menu-item"
            style={{ color: 'var(--warn)', fontWeight: 500, justifyContent: 'flex-start' }}
            onClick={killAdbServer}
            title="Stops the host adb server so WebUSB can claim the USB device"
          >
            Stop adb server (free USB)
          </button>
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
        <span className="hide-narrow">Reboot</span>
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

/** Console context bar: which device, its mode, and the everyday actions. */
function DeviceBar() {
  const { s, toast, loadProcs, loadApps, loadFiles, toggleRoot, disconnectDevice, ask } = useLoupe();
  const refresh = () => {
    if (!s.connected) { toast('No device connected'); return; }
    loadProcs(); loadApps(s.appFilter); loadFiles(s.path);
    toast('Refreshed');
  };
  return (
    <div className="ctxbar">
      <DevicePicker />
      {s.connected && (
        <button className="btn" title={`Disconnect ${s.device?.serial || 'device'}`} style={{ borderColor: 'var(--err)', color: 'var(--err)' }}
          onClick={() => ask({ title: 'Disconnect this device?', body: <>{s.device?.model} <span className="mono" style={{ color: 'var(--ink)' }}>{s.device?.serial}</span> will be released. You can connect it again from the device menu.</>, yes: 'Disconnect', danger: true }, disconnectDevice)}>
          <Icon size={14} d="M6 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2 M10.5 8H14 M12 6l2 2-2 2" />
          <span className="hide-narrow">Disconnect</span>
        </button>
      )}
      <div className="spacer" />
      <button
        className="btn"
        title={s.rootMode ? 'Elevated: commands run through su' : 'Run commands through su'}
        disabled={!s.connected || s.rootBusy}
        onClick={toggleRoot}
        style={{ borderColor: s.rootMode ? 'var(--warn)' : undefined, color: s.rootMode ? 'var(--warn)' : undefined }}
      >
        <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
          {s.rootBusy ? '…' : s.rootMode ? '# root' : '$ shell'}
        </span>
      </button>
      <button className="btn" onClick={refresh} title="Refresh processes, apps and files">
        <Icon size={14} d="M13 8a5 5 0 1 1-1.7-3.8 M13 2v3h-3" />
        <span className="hide-narrow">Refresh</span>
      </button>
      {s.connected && <RebootMenu />}
    </div>
  );
}

export function Header() {
  const { s, set, toggleTheme } = useLoupe();
  return (
    <div>
      <header className="header">
        <Logo />
        <nav className="nav" aria-label="View">
          {[['console', 'Console'], ['decompiler', 'Decompiler']].map(([v, l]) => (
            <button key={v} className={s.view === v ? 'on' : ''} aria-current={s.view === v ? 'page' : undefined}
              onClick={() => set({ view: v })}>{l}</button>))}
        </nav>
        <div className="spacer" />
        <button className="btn-icon" onClick={toggleTheme} aria-label="Toggle theme"
          title={s.theme === 'dark' ? 'Dark theme (switch to light)' : 'Light theme (switch to dark)'}>
          {s.theme === 'dark'
            ? <Icon d="M13.5 9.6A5.8 5.8 0 1 1 6.4 2.5a4.6 4.6 0 0 0 7.1 7.1z" />
            : (
              <Icon>
                <circle cx="8" cy="8" r="3.4" />
                <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.1 3.1l1.1 1.1M11.8 11.8l1.1 1.1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1" />
              </Icon>
            )}
        </button>
      </header>
      {s.view === 'console' && <DeviceBar />}
    </div>
  );
}
