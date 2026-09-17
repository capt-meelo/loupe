import React, { useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useLoupe } from '../../store.jsx';
import { EmptyState, Mini, AppSelect } from '../ui.jsx';

const sectionHead = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  padding: '5px 10px', borderBottom: '1px solid var(--line)',
  fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
  color: 'var(--ink3)', flex: '0 0 auto'
};

/**
 * Frida: install/start/stop the server, author a script, and run it. Running
 * goes through the Node bridge, which speaks Frida's protocol to the device and
 * streams the script's output back into the log.
 */
export function Frida() {
  const { s, set, checkFrida, toast,
          installFrida, startFrida, stopFrida, runScript, stopScript } = useLoupe();
  const logRef = useRef(null);

  useEffect(() => {
    if (s.connected && s.frida === null && !s.fridaBusy) checkFrida();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.connected]);

  // Follow the tail as new lines stream in.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [s.fridaLog]);

  if (!s.connected) return <EmptyState>Connect a device to check for frida-server.</EmptyState>;

  const f = s.frida;
  const target = (s.fridaTarget || '').trim();

  return (
    <>
      <div className="panel-toolbar">
        <span className="mono" style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 9px', borderRadius: 7, fontSize: 10.5,
          flex: '0 0 auto',
          border: '1px solid ' + (f?.running ? 'var(--ok)' : 'var(--line)'),
          color: f?.running ? 'var(--ok)' : 'var(--ink3)'
        }}>
          <span className="dot" style={{
            width: 5, height: 5, background: f?.running ? 'var(--ok)' : 'var(--ink3)',
            animation: f?.running ? 'lpPulse 1.6s ease-in-out infinite' : 'none'
          }} />
          {s.fridaBusy ? 'checking…' : f?.running ? `running · pid ${f.pid}` : 'not running'}
        </span>

        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink3)', flex: '0 0 auto' }}>
          {s.fridaInstalled ? `installed v${s.fridaInstalled}` : 'not installed'}
        </span>

        <Mini label={s.fridaWorking ? 'Working…' : s.fridaInstalled ? 'Update to latest' : 'Download + install'}
          tone="accent" disabled={s.fridaWorking || !s.connected}
          title="Fetches the newest frida-server for this device's ABI and pushes it to /data/local/tmp"
          onClick={installFrida} />

        {f?.running
          ? <Mini label="Stop server" tone="danger" disabled={s.fridaWorking} onClick={stopFrida} />
          : <Mini label="Start server" disabled={s.fridaWorking || !s.fridaInstalled} onClick={startFrida} />}
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
        <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)' }}>
          <div style={sectionHead}>
            <span>Script</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0 }}>
              <AppSelect apps={s.apps} appIcons={s.appIcons} value={s.fridaTarget}
                placeholder="Select target app" open={s.fridaTargetOpen}
                onToggle={(v) => set({ fridaTargetOpen: v })} onPick={(pkg) => set({ fridaTarget: pkg })} />
              <label className="mono" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, color: 'var(--ink3)', cursor: 'pointer' }}
                title="Launch the app fresh instead of attaching to it running">
                <input type="checkbox" checked={s.fridaSpawn}
                  onChange={(e) => set({ fridaSpawn: e.target.checked })} />
                spawn
              </label>
              {s.fridaRunning
                ? <button className="mini danger" onClick={stopScript}>■ Stop</button>
                : <button className="mini accent" disabled={!f?.running || !target} onClick={runScript}
                    title={!f?.running ? 'Start frida-server first' : !target ? 'Pick a target app' : 'Run this script'}>
                    ▶ Run
                  </button>}
            </span>
          </div>
          <div style={{ flex: '0 0 auto', padding: '6px 10px', borderBottom: '1px solid var(--line)' }}>
            <input className="mono" value={s.fridaUrl}
              onChange={(e) => set({ fridaUrl: e.target.value })}
              placeholder="Script URL — Frida CodeShare, a GitHub .js file, or a Gist — then press Run"
              title="Paste a link to a Frida script (codeshare.frida.re/@user/project, a GitHub file, or a Gist) and press Run to fetch and execute it. Leave empty to run the editor below."
              style={{
                width: '100%', boxSizing: 'border-box', fontSize: 11, padding: '5px 8px',
                background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--ink)'
              }} />
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
            <CodeMirror
              value={s.script}
              onChange={(v) => set({ script: v })}
              theme="dark"
              height="100%"
              extensions={[javascript()]}
              basicSetup={{ lineNumbers: true, highlightActiveLine: true, foldGutter: false, autocompletion: false }}
              placeholder="// Paste a Frida script here, or use the URL box above."
              style={{ height: '100%', fontSize: 12 }} />
          </div>
        </div>

        <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={sectionHead}>
            <span>{s.fridaRunning ? 'Output · running' : 'Server & script log'}</span>
            {s.fridaLog.length > 0 && (
              <button className="linkbtn to-accent mono" style={{ fontSize: 9.5, color: 'var(--ink3)' }}
                onClick={() => set({ fridaLog: [] })}>clear</button>
            )}
          </div>
          <div ref={logRef} className="scroll mono" style={{ flex: '1 1 auto', padding: '9px 11px', fontSize: 11, lineHeight: 1.8, color: 'var(--ink2)' }}>
            {s.fridaLog.length === 0 ? (
              <div style={{ color: 'var(--ink3)' }}>
                Install, start and <span style={{ color: 'var(--ink2)' }}>▶ Run</span> log their
                progress here. A script's <span className="mono">console.log</span> and
                <span className="mono"> send()</span> stream in live.
              </div>
            ) : (
              s.fridaLog.map((l, i) => (
                <div key={i} style={{
                  color: /FAILED|✗/.test(l) ? 'var(--err)' : /»|«/.test(l) ? 'var(--ink)' : undefined,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                }}>{l}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
