import React, { useMemo, useRef, useState } from 'react';
import { LoupeProvider, useLoupe } from './store.jsx';
import { Header } from './components/Header.jsx';
import { Mirror } from './components/Mirror.jsx';
import { PanelSlot } from './components/PanelSlot.jsx';
import { Toast } from './components/Toast.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';

import { Logcat, filterLogs } from './components/panels/Logcat.jsx';
import { Sockets } from './components/panels/Sockets.jsx';
import { Proxy } from './components/panels/Proxy.jsx';
import { Memory } from './components/panels/Memory.jsx';
import { Perf } from './components/panels/Perf.jsx';
import { Inspector } from './components/panels/Inspector.jsx';
import { Settings } from './components/panels/Settings.jsx';
import { Shell } from './components/panels/Shell.jsx';
import { Frida } from './components/panels/Frida.jsx';
import { Files } from './components/panels/Files.jsx';
import { Apps } from './components/panels/Apps.jsx';
import { Procs } from './components/panels/Procs.jsx';
import { DeviceInfo } from './components/panels/DeviceInfo.jsx';

// Every panel by id; which pane each lives in is state (s.topTabs / s.bottomTabs),
// so tabs can be dragged between panes.
const PANELS = {
  logcat: Logcat, traffic: Sockets, perf: Perf, memory: Memory, inspector: Inspector, settings: Settings,
  info: DeviceInfo, files: Files, apps: Apps, procs: Procs, shell: Shell, frida: Frida, proxy: Proxy
};
const LABELS = {
  logcat: 'Logcat', traffic: 'Network', perf: 'Performance', memory: 'Memory', inspector: 'Inspector', settings: 'Settings',
  info: 'Device Info', files: 'Files', apps: 'Apps', procs: 'Processes', shell: 'Shell', frida: 'Frida', proxy: 'Proxy'
};

function Workspace() {
  const { s, set } = useLoupe();
  const host = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [railDragging, setRailDragging] = useState(false);

  // Narrow deps: re-filtering thousands of logs on every unrelated state change
  // was a big part of the slowdown.
  const logCount = useMemo(
    () => filterLogs(s).length,
    [s.logs, s.levels, s.logQ, s.logApp, s.logAppPids]
  );

  const badges = {
    logcat: logCount ? String(logCount) : '',
    traffic: s.net.length ? String(s.net.length) : '',
    inspector: s.nodes.length ? String(s.nodes.length) : '',
    files: s.files.length ? String(s.files.length) : '',
    apps: s.apps.length ? String(s.apps.length) : '',
    procs: s.procs.length ? String(s.procs.length) : ''
  };
  const toDefs = (ids) => ids.filter((id) => LABELS[id]).map((id) => ({ id, label: LABELS[id], badge: badges[id] || '' }));
  const topDefs = toDefs(s.topTabs);
  const bottomDefs = toDefs(s.bottomTabs);

  /** Move a tab to a pane, before `beforeId` (or to the end). Handles reordering
   *  within a pane and dragging across, and keeps each pane's active tab valid. */
  const moveTab = (id, toPane, beforeId = null) => {
    const lists = { top: s.topTabs.filter((t) => t !== id), bottom: s.bottomTabs.filter((t) => t !== id) };
    const dest = lists[toPane];
    const at = beforeId ? dest.indexOf(beforeId) : -1;
    dest.splice(at < 0 ? dest.length : at, 0, id);
    const patch = { topTabs: lists.top, bottomTabs: lists.bottom, [`${toPane}Open`]: true, [toPane]: id };
    const from = toPane === 'top' ? 'bottom' : 'top';
    if (s[from] === id) patch[from] = lists[from][0] || '';   // source pane lost its active tab
    set(patch);
  };

  /** Shared drag plumbing: `onMove(ev)` decides what the pointer means. */
  const drag = (setFlag, onMove) => (e) => {
    e.preventDefault();
    setFlag(true);
    const up = () => {
      setFlag(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', up);
  };

  const startDrag = drag(setDragging, (ev) => {
    if (!host.current) return;
    const r = host.current.getBoundingClientRect();
    const f = Math.min(0.85, Math.max(0.15, (ev.clientY - r.top) / r.height));
    set({ split: f, topOpen: true, bottomOpen: true });
  });

  // The rail exists for the mirror, so its width is worth trading against the
  // panels. Capped so neither side can be dragged away entirely.
  const startRailDrag = drag(setRailDragging, (ev) => {
    set({ railW: Math.min(window.innerWidth - 420, Math.max(260, ev.clientX)) });
  });

  return (
    <div style={{
      height: '100vh', display: 'grid', gridTemplateRows: 'auto minmax(0,1fr)',
      background: 'var(--bg)', color: 'var(--ink)', fontSize: 13
    }}>
      <Header />

      <div style={{ display: 'grid', gridTemplateColumns: `${s.railW}px auto minmax(0,1fr)`, minHeight: 0 }}>
        <Mirror />

        <div className={'vsplitter' + (railDragging ? ' dragging' : '')}
          onMouseDown={startRailDrag} title="Drag to resize the mirror" />

        <main ref={host} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, background: 'var(--bg)' }}>
          <PanelSlot isTop defs={topDefs} panels={PANELS} onMoveTab={moveTab}
            active={s.top} open={s.topOpen} other={s.bottomOpen} split={s.split} />

          <div className={'splitter' + (dragging ? ' dragging' : '')} onMouseDown={startDrag} />

          <PanelSlot defs={bottomDefs} panels={PANELS} onMoveTab={moveTab}
            active={s.bottom} open={s.bottomOpen} other={s.topOpen} split={1 - s.split} />
        </main>
      </div>

      <Toast />
    </div>
  );
}

export const App = () => (
  <ErrorBoundary>
    <LoupeProvider>
      <Workspace />
    </LoupeProvider>
  </ErrorBoundary>
);
