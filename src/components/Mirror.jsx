import React, { useRef } from 'react';
import { useLoupe } from '../store.jsx';
import { RailHeading, Icon } from './ui.jsx';
import { AndroidKeyCode } from '../lib/scrcpy.js';

/**
 * Mirror toolbar. Every key is a real scrcpy control message (or an adb
 * fallback), so these act on the device rather than just logging.
 */
const TOOL_KEYS = [
  { title: 'Power', d: 'M8 2.2v4.6 M4.7 4.4a4.6 4.6 0 1 0 6.6 0', key: 'Power' },
  { title: 'Volume up', d: 'M2 6.2h2.4L7.6 3.6v8.8L4.4 9.8H2z M10.2 5.6a3.4 3.4 0 0 1 0 4.8 M12.4 3.4a6.4 6.4 0 0 1 0 9.2', key: 'VolumeUp' },
  { title: 'Volume down', d: 'M2 6.2h2.4L7.6 3.6v8.8L4.4 9.8H2z M10.2 5.6a3.4 3.4 0 0 1 0 4.8', key: 'VolumeDown' },
  { sep: true },
  { title: 'Back', d: 'M9.6 3.2L4.6 8l5 4.8', key: 'AndroidBack' },
  { title: 'Home', d: 'M8 3.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2', key: 'AndroidHome' },
  { title: 'Recents', d: 'M3.6 3.6h8.8v8.8H3.6z', key: 'AndroidAppSwitch' },
  { sep: true },
  { title: 'Notification shade', d: 'M2.6 3.4h10.8 M5 6.6l3 3 3-3', act: 'notifications' },
  { title: 'Wake screen', d: 'M8 4.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4 M8 1.4v1.4 M8 13.2v1.4 M1.6 8H3 M13 8h1.4', act: 'wake' },
  { title: 'Menu', d: 'M3 5h10 M3 8h10 M3 11h10', key: 'ContextMenu' },
  { sep: true },
  { title: 'Screenshot', d: 'M1.8 4.4h12.4v8.2H1.8z M5.4 4.4l1-1.6h3.2l1 1.6 M8 6.9a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4', act: 'screenshot' },
  { title: 'Record screen', d: 'M8 2.6a5.4 5.4 0 1 0 0 10.8 5.4 5.4 0 0 0 0-10.8', act: 'record' },
  { title: 'Rotate', d: 'M13 8a5 5 0 1 1-1.7-3.8 M13 2v3h-3', act: 'rotate' }
];

const mmss = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

function ToolKeys({ canvasRef }) {
  const { s, pressKey, rotateDevice, expandNotifications, screenshot, wakeScreen, toggleRecording } = useLoupe();
  const onPress = (k) => () => {
    if (k.act === 'screenshot') return screenshot();
    if (k.act === 'rotate') return rotateDevice();
    if (k.act === 'notifications') return expandNotifications();
    if (k.act === 'wake') return wakeScreen();
    if (k.act === 'record') return toggleRecording(canvasRef.current);
    return pressKey(AndroidKeyCode[k.key], k.title);
  };

  return (
    <div style={{
      flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 1, padding: '5px 4px',
      borderBottom: '1px solid var(--line)', background: 'var(--bg3)',
      // Never wrap: a second row pushes the mirror down and shrinks it. Every
      // key stays on one line, and a too-narrow rail scrolls instead.
      flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none'
    }} className="toolkey-row">
      {TOOL_KEYS.map((k, i) =>
        k.sep ? (
          <div key={'s' + i} style={{ width: 1, height: 16, background: 'var(--line2)', margin: '0 3px', flex: '0 0 auto' }} />
        ) : (
          <button
            key={k.title}
            title={k.act === 'record' && s.recording ? `Stop recording (${mmss(s.recordSecs)})` : k.title}
            onClick={onPress(k)}
            className={'toolkey' + (k.act === 'record' && s.recording ? ' rec' : '')}
            style={k.act === 'record' && s.recording ? { width: 'auto', gap: 5, padding: '0 7px' } : undefined}
          >
            <Icon d={k.d} />
            {k.act === 'record' && s.recording && (
              <span className="mono" style={{ fontSize: 10 }}>{mmss(s.recordSecs)}</span>
            )}
          </button>
        )
      )}

    </div>
  );
}

/** The mirrored screen: a canvas scrcpy decodes into, plus tap forwarding. */
function DeviceScreen({ canvasRef }) {
  const { s, pointerDown, pointerMove, pointerUp, startMirror } = useLoupe();
  const wrapRef = useRef(null);
  const down = useRef(false);

  const aspect = s.mirrorSize && s.mirrorSize.width
    ? `${s.mirrorSize.width} / ${s.mirrorSize.height}`
    : '9 / 19.5';

  /**
   * The canvas is letterboxed by object-fit:contain, so map client coords
   * against the drawn video box, not the element box, or touches land skewed.
   */
  const norm = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vw = s.mirrorSize?.width || r.width;
    const vh = s.mirrorSize?.height || r.height;
    const scale = Math.min(r.width / vw, r.height / vh);
    const drawnW = vw * scale;
    const drawnH = vh * scale;
    const offX = (r.width - drawnW) / 2;
    const offY = (r.height - drawnH) / 2;
    const nx = (e.clientX - r.left - offX) / drawnW;
    const ny = (e.clientY - r.top - offY) / drawnH;
    return [Math.max(0, Math.min(1, nx)), Math.max(0, Math.min(1, ny))];
  };

  const onPointerDown = (e) => {
    if (!s.mirrorOn) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    down.current = true;
    const [nx, ny] = norm(e);
    pointerDown(nx, ny);
  };

  const onPointerMove = (e) => {
    if (!s.mirrorOn || !down.current) return;
    const [nx, ny] = norm(e);
    pointerMove(nx, ny);
  };

  const endPointer = (e) => {
    if (!s.mirrorOn || !down.current) return;
    down.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    const [nx, ny] = norm(e);
    pointerUp(nx, ny);
  };

  return (
    <div ref={wrapRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      style={{
      // Box matches the device aspect exactly, so the canvas fills it with no
      // letterbox gutters; whichever of height/width binds first wins.
      //
      // It takes whatever height the rail gives it rather than a vh guess: a
      // fixed cap here can't know how tall the rail actually is, so it used to
      // leave ~130px of the pane unused at common window sizes.
      position: 'relative', aspectRatio: aspect,
      flex: '1 1 auto', minHeight: 0, height: 'auto', width: 'auto', maxWidth: '100%',
      borderRadius: 18, overflow: 'hidden', border: '1px solid var(--line2)',
      background: '#12141a', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: 'var(--sh)',
      cursor: s.mirrorOn ? 'crosshair' : 'default',
      touchAction: 'none', userSelect: 'none'
    }}>
      <canvas ref={canvasRef} style={{
        width: '100%', height: '100%', objectFit: 'fill',
        display: s.mirrorOn ? 'block' : 'none',
        pointerEvents: 'none', touchAction: 'none'
      }} />

      {!s.mirrorOn && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 18, textAlign: 'center' }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)"
            strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="7" y="2" width="10" height="20" rx="2.4" /><path d="M11 18h2" />
          </svg>
          <div style={{ color: 'var(--ink2)', fontSize: 12, fontWeight: 500 }}>
            {s.device ? s.device.model : 'No device'}
          </div>
          {s.device ? (
            <button className="btn-accent" disabled={s.mirrorBusy}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); startMirror(canvasRef.current); }}>
              {s.mirrorBusy ? 'Starting…' : 'Start mirroring'}
            </button>
          ) : (
            <div className="mono" style={{ color: 'var(--ink3)', fontSize: 10, lineHeight: 1.6 }}>
              Connect a device to begin.
            </div>
          )}
          {s.mirrorErr && (
            <div className="mono" style={{ color: 'var(--warn)', fontSize: 9.5, lineHeight: 1.5, maxWidth: 240 }}>
              {s.mirrorErr}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Mirror() {
  const { s, set, sendText, startMirror, stopMirror } = useLoupe();
  const canvasRef = useRef(null);

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid var(--line)', background: 'var(--bg2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 38, borderBottom: '1px solid var(--line)', flex: '0 0 auto' }}>
        <RailHeading>Mirror</RailHeading>
        <span className="mono" style={{
          display: 'flex', alignItems: 'center', gap: 5, fontSize: 10,
          color: s.mirrorOn ? 'var(--err)' : s.connected ? 'var(--ok)' : 'var(--ink3)'
        }}>
          <span className="dot" style={{
            width: 5, height: 5,
            background: s.mirrorOn ? 'var(--err)' : s.connected ? 'var(--ok)' : 'var(--ink3)',
            animation: s.mirrorOn ? 'lpPulse 1.6s ease-in-out infinite' : 'none'
          }} />
          {s.mirrorOn ? 'LIVE' : s.connected ? 'ONLINE' : 'OFFLINE'}
        </span>
        <button
          className={'toolkey' + (s.mirrorOn ? ' on' : '')}
          title={s.mirrorOn ? 'Stop mirroring' : 'Start mirroring'}
          disabled={!s.connected || s.mirrorBusy}
          onClick={() => (s.mirrorOn ? stopMirror() : startMirror(canvasRef.current))}
        >
          <Icon size={14} d="M8 3.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6 M8 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6" />
        </button>
        <div className="spacer" />
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>
          {s.mirrorSize ? `${s.mirrorSize.width}×${s.mirrorSize.height}` : ''}
        </span>
      </div>

      <ToolKeys canvasRef={canvasRef} />

      <div style={{
        flex: '1 1 auto', minHeight: 0, padding: '8px 8px 12px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9
      }}>
        <DeviceScreen canvasRef={canvasRef} />

        <div style={{ width: '100%', flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 7, padding: '5px 9px', border: '1px solid var(--line)', borderRadius: 7 }}>
          <input className="mono" value={s.typeText}
            onChange={(e) => set({ typeText: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') sendText(); }}
            placeholder="Type text into the device…"
            style={{ flex: '1 1 auto', minWidth: 0, fontSize: 10.5 }} />
          <button onClick={sendText} style={{ fontSize: 10.5, color: 'var(--accent)', fontWeight: 600 }}>Send</button>
        </div>
      </div>
    </aside>
  );
}
