import React, {
  createContext, useContext, useReducer, useEffect, useMemo, useCallback, useRef
} from 'react';
import * as webadb from './lib/webadb.js';
import * as mirror from './lib/scrcpy.js';
import * as record from './lib/record.js';
import { buildCore, machineFor } from './lib/elfcore.js';

const LIMITS = { logs: 2000, shell: 1500, perf: 60 };

let logSeq = 0;
/** Parses one `logcat -v brief` line: `LEVEL/TAG( PID): message`. */
function parseLogcat(line) {
  const m = /^([VDIWEF])\/(.*?)\(\s*(\d+)\):\s?(.*)$/.exec(line);
  if (!m) return null;
  return { id: 'l' + ++logSeq, ts: Date.now(), level: m[1], tag: m[2].trim(), pid: Number(m[3]), msg: m[4] };
}

const parsePackages = (text) =>
  text.split('\n').map((l) => l.replace(/^package:/, '').trim()).filter(Boolean).sort();

/** `ps -A -o PID,USER,RSS,%CPU,NAME` → rows. */
function parseProcs(text) {
  const rows = [];
  for (const line of text.split('\n').filter(Boolean).slice(1)) {
    const p = line.trim().split(/\s+/);
    if (p.length < 5) continue;
    const pid = Number(p[0]);
    if (!Number.isFinite(pid)) continue;
    rows.push({ pid, user: p[1], rss: Number(p[2]) || 0, cpu: Number(p[3]) || 0, name: p.slice(4).join(' ') });
  }
  return rows;
}

/** `uiautomator dump` XML → a flat, depth-tagged node list. */
function parseHierarchy(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const out = [];
  let n = 0;
  const walk = (el, depth) => {
    for (const child of el.children) {
      if (child.tagName !== 'node') { walk(child, depth); continue; }
      const a = (k) => child.getAttribute(k) || '';
      const bounds = a('bounds'); // [l,t][r,b]
      const m = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(bounds);
      out.push({
        id: 'n' + n++,
        depth,
        cls: a('class').split('.').pop() || a('class'),
        fullClass: a('class'),
        rid: a('resource-id'),
        text: a('text'),
        desc: a('content-desc'),
        pkg: a('package'),
        clickable: a('clickable'),
        focusable: a('focusable'),
        enabled: a('enabled'),
        bounds,
        box: m ? [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])] : null
      });
      walk(child, depth + 1);
    }
  };
  walk(doc.documentElement, 0);
  return out;
}

/** `ss -tunp` (or netstat) → socket rows. */
function parseSockets(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || /^(Netid|Proto|Active)/i.test(t)) continue;
    const p = t.split(/\s+/);
    if (p.length < 5) continue;
    const procMatch = /users:\(\("([^"]+)",pid=(\d+)/.exec(t) || /(\d+)\/(\S+)\s*$/.exec(t);
    let proc = '', pid = null;
    if (procMatch) {
      if (procMatch[0].startsWith('users:')) { proc = procMatch[1]; pid = Number(procMatch[2]); }
      else { pid = Number(procMatch[1]); proc = procMatch[2]; }
    }
    rows.push({ proto: p[0], state: p[1], local: p[4] || '', peer: p[5] || '', proc: proc || '—', pid });
  }
  return rows;
}

// One shell round trip gathers every device metric. Markers split the sections.
const PERF_PROBE =
  "echo __STAT; head -1 /proc/stat; " +
  "echo __MEM; grep -E 'MemTotal|MemAvailable' /proc/meminfo; " +
  "echo __LOAD; cat /proc/loadavg; echo __UP; cat /proc/uptime; " +
  "echo __BAT; dumpsys battery; echo __DF; df -k /data; " +
  "echo __ADDR; ip -o -4 addr show; echo __NDEV; cat /proc/net/dev; " +
  "echo __WIFI; cmd -w wifi status 2>/dev/null | grep -m1 WifiInfo; " +
  // FPS: total frames the foreground app has rendered. The delta between samples
  // is frames/sec of whatever is on screen (0 when nothing is redrawing).
  "echo __GFX; " +
  "PKG=$(dumpsys activity activities 2>/dev/null | grep -m1 ResumedActivity | grep -Eo '[a-zA-Z0-9_.]+/[a-zA-Z0-9_.$]+' | head -1 | cut -d/ -f1); " +
  "echo pkg=$PKG; dumpsys gfxinfo $PKG 2>/dev/null | grep -m1 'Total frames rendered'";

const BATTERY_STATUS = { 1: 'unknown', 2: 'charging', 3: 'discharging', 4: 'not charging', 5: 'full' };
const BATTERY_HEALTH = { 1: 'unknown', 2: 'good', 3: 'overheat', 4: 'dead', 5: 'over-voltage', 6: 'failure', 7: 'cold' };

/**
 * Parses the PERF_PROBE output into a device snapshot. `prevRef` holds the last
 * /proc/stat totals so CPU can be a real utilization delta between samples.
 */
function parsePerf(text, prevRef, now) {
  const sec = {};
  let cur = null;
  for (const line of text.split('\n')) {
    const m = /^__([A-Z]+)$/.exec(line.trim());
    if (m) { cur = m[1]; sec[cur] = []; continue; }
    if (cur) sec[cur].push(line);
  }
  const find = (name, re) => { const m = re.exec((sec[name] || []).join('\n')); return m ? m[1] : null; };
  const prev = prevRef.current || (prevRef.current = {}); // holds cpu + net baselines

  // CPU: utilization since the previous sample.
  let cpu = null;
  const nums = ((sec.STAT || [])[0] || '').replace(/^cpu\s+/, '').trim().split(/\s+/).map(Number);
  if (nums.length >= 4 && nums.every(Number.isFinite)) {
    const idle = (nums[3] || 0) + (nums[4] || 0);
    const total = nums.reduce((a, b) => a + b, 0);
    if (prev.cpu && total > prev.cpu.total) {
      const dt = total - prev.cpu.total;
      cpu = Math.max(0, Math.min(100, (100 * (dt - (idle - prev.cpu.idle))) / dt));
    }
    prev.cpu = { total, idle };
  }

  const memTotal = Number(find('MEM', /MemTotal:\s*(\d+)/)) || 0;
  const memAvail = Number(find('MEM', /MemAvailable:\s*(\d+)/)) || 0;
  const mem = memTotal ? { total: memTotal, used: memTotal - memAvail, pct: ((memTotal - memAvail) / memTotal) * 100 } : null;

  // Anchor to line starts: "Max charging voltage: 0" must not shadow "voltage:".
  const batTemp = find('BAT', /^\s*temperature:\s*(-?\d+)/m);
  const batVolt = find('BAT', /^\s*voltage:\s*(\d+)/m);
  const batText = (sec.BAT || []).join('\n');
  const battery = {
    level: Number(find('BAT', /^\s*level:\s*(\d+)/m)),
    status: BATTERY_STATUS[Number(find('BAT', /^\s*status:\s*(\d+)/m))] || 'unknown',
    health: BATTERY_HEALTH[Number(find('BAT', /^\s*health:\s*(\d+)/m))] || 'unknown',
    tempC: batTemp != null ? Number(batTemp) / 10 : null,
    voltageV: batVolt != null ? Number(batVolt) / 1000 : null,
    tech: (find('BAT', /^\s*technology:\s*(.+)/m) || '').trim() || null,
    plugged: /AC powered:\s*true/.test(batText) ? 'AC'
      : /USB powered:\s*true/.test(batText) ? 'USB'
      : /Wireless powered:\s*true/.test(batText) ? 'wireless' : 'unplugged'
  };

  // Storage: the one non-header df row (its 2nd field is the block count). The
  // "Mounted on" column can be a bind-mount path, so don't match on it.
  let storage = null;
  const dline = (sec.DF || []).find((l) => { const f = l.trim().split(/\s+/); return f.length >= 5 && /^\d+$/.test(f[1]); });
  if (dline) {
    const f = dline.trim().split(/\s+/);
    const total = Number(f[1]), used = Number(f[2]);
    if (total > 0) storage = { total, used, avail: Number(f[3]), pct: (used / total) * 100 };
  }

  const load = (sec.LOAD || [])[0] ? (sec.LOAD[0].trim().split(/\s+/).slice(0, 3).join('  ')) : null;
  const uptime = (sec.UP || [])[0] ? Number(sec.UP[0].trim().split(/\s+/)[0]) : null;

  // FPS: frames-rendered delta for the foreground app since the last sample.
  const gfx = (sec.GFX || []).join('\n');
  const fpsApp = (/pkg=(\S+)/.exec(gfx) || [])[1] || '';
  const frames = Number((/Total frames rendered:\s*(\d+)/.exec(gfx) || [])[1]);
  let fps = null;
  if (fpsApp && Number.isFinite(frames)) {
    const p = prev.gfx;
    if (p && p.pkg === fpsApp && now > p.t && frames >= p.frames) {
      fps = (frames - p.frames) / ((now - p.t) / 1000);
    }
    prev.gfx = { pkg: fpsApp, frames, t: now };
  } else {
    prev.gfx = null;
  }

  // Network: the active interface is the first non-loopback with a global IPv4.
  let network = null;
  const addr = (sec.ADDR || []).map((l) => /^\d+:\s+(\S+)\s+inet\s+(\d+\.\d+\.\d+\.\d+)\/\d+.*scope global/.exec(l)).find(Boolean);
  if (addr) {
    const iface = addr[1];
    const type = /^wlan|^wifi/.test(iface) ? 'Wi-Fi' : /^rmnet|^ccmni|^radio/.test(iface) ? 'Mobile' : iface;
    network = { iface, ip: addr[2], type };
    // Throughput from /proc/net/dev deltas for that interface.
    const dev = (sec.NDEV || []).find((l) => l.trim().startsWith(iface + ':'));
    if (dev) {
      const f = dev.slice(dev.indexOf(':') + 1).trim().split(/\s+/).map(Number);
      const rx = f[0], tx = f[8];
      const p = prev.net;
      if (p && p.iface === iface && now > p.t && rx >= p.rx) {
        const secs = (now - p.t) / 1000;
        network.rxRate = (rx - p.rx) / secs; // bytes/s
        network.txRate = (tx - p.tx) / secs;
      }
      prev.net = { iface, rx, tx, t: now };
    }
    // Wi-Fi extras from `cmd wifi status`.
    const w = (sec.WIFI || []).join(' ');
    const wi = (re) => { const m = re.exec(w); return m ? m[1] : null; };
    if (/WifiInfo/.test(w)) {
      network.ssid = wi(/SSID:\s*"([^"]*)"/);
      const rssi = wi(/RSSI:\s*(-?\d+)/);
      network.rssi = rssi != null ? Number(rssi) : null;
      const link = wi(/Link speed:\s*(\d+)/);
      network.linkMbps = link != null ? Number(link) : null;
    }
  }

  return { cpu, mem, battery, storage, load, uptime, network, fps, fpsApp };
}

const initialState = {
  theme: 'dark',
  connected: false,
  devOpen: false, rebootOpen: false,
  device: null,
  deviceInfo: null,
  usbSupported: webadb.usbSupported(),
  rootAvailable: false, rootMode: false, rootBusy: false,

  // Wireless ADB (via the Node bridge)
  wifiOpen: false, wifiTab: 'code', wifiBusy: false, wifiLog: [],
  pairAddr: '', pairCode: '', connectAddr: '',
  wifiDevices: [],
  qr: null,              // { password, name, payload }


  top: 'info',
  bottom: 'shell',
  // Which tabs live in each pane, in order. Tabs are draggable between panes.
  topTabs: ['info', 'logcat', 'traffic', 'proxy', 'perf', 'inspector', 'settings'],
  bottomTabs: ['files', 'apps', 'procs', 'memory', 'shell', 'frida'],
  split: 0.52,
  railW: 416,          // mirror rail width in px, dragged by the rail edge
  topOpen: true,
  bottomOpen: true,

  logs: [], paused: false, logQ: '',
  logApp: '', logAppPids: [], logAppOpen: false,   // filter logcat to one app's processes
  levels: { V: false, D: true, I: true, W: true, E: true, F: true },

  shell: [{ t: 'Connect a device to run commands.', k: 'dim' }],
  shellIn: '', hist: [], histIx: -1,

  path: '/sdcard', files: [], filesBusy: false,
  fileQ: '',            // filters the current folder
  findResults: null,    // recursive search results, or null when not searching
  findBusy: false, findRoot: '',
  fileSel: null,        // { name, type, size }
  preview: null,        // { kind:'image'|'html'|'pdf'|'audio'|'video'|'text'|'sqlite'|'binary', url?, text?, tables?, truncated, name }
  previewBusy: false,
  clipboard: null,      // { path, name, op:'copy'|'cut' }
  transfer: '',         // in-flight upload/download label
  apps: [], appQ: '', appFilter: 'user', appsBusy: false, appIcons: {},
  appSel: null, appInfo: null, appInfoBusy: false, installBusy: false,
  procs: [], procQ: '', procSort: 'pid', procDir: 'desc', procsBusy: false,

  // Mirror
  mirrorOn: false, mirrorBusy: false, mirrorErr: '', mirrorSize: null,
  recording: false, recordSecs: 0,
  typeText: '',

  // Inspector
  nodes: [], insSel: null, insBusy: false,

  // Settings editor
  settingsNs: 'system', settings: [], settingsBusy: false, settingsQ: '',
  settingsSel: null, settingsVal: '',

  // Performance
  perf: [], perfBusy: false,
  proxyHosts: [],        // this machine's LAN addresses, suggested as the proxy host

  // Proxy tab: point the device at an external intercepting proxy (Burp, etc.)
  devProxyHost: '127.0.0.1', devProxyPort: '8080', devProxyLive: '',
  certName: '', certHash: '', certInstalled: null, certBusy: false,
  proxyLog: [],

  // Memory
  memPid: null, memQ: '', memText: '', memBusy: false, memLabel: '',
  memRegionQ: '', memCapMB: 256,

  // Network + Frida
  net: [], netQ: '', netBusy: false,
  frida: null, fridaBusy: false,
  fridaLog: [], fridaInstalled: '', fridaWorking: false,
  fridaRunning: false, fridaSpawn: false, fridaUrl: '',
  fridaTarget: '', fridaTargetOpen: false,   // package the script attaches to / spawns
  script: "// Frida script: pick a target app, then press Run.\nJava.perform(() => {\n  // const C = Java.use('com.example.Target');\n  // C.method.implementation = function (...args) {\n  //   console.log('[*] called', args);\n  //   return this.method(...args);\n  // };\n});",

  toast: ''
};

function reducer(state, action) {
  switch (action.type) {
    case 'merge': return { ...state, ...action.patch };
    case 'update': return { ...state, ...action.fn(state) };
    default: return state;
  }
}

const Ctx = createContext(null);
export const useLoupe = () => useContext(Ctx);

export function LoupeProvider({ children }) {
  const [s, dispatch] = useReducer(reducer, initialState);
  const toastTimer = useRef(null);
  const qrCancel = useRef(null);
  const fridaWs = useRef(null);
  const appIconsRef = useRef({});   // pkg → data URL | null (in-flight), so each is fetched once

  const set = useCallback((patch) => dispatch({ type: 'merge', patch }), []);
  const update = useCallback((fn) => dispatch({ type: 'update', fn }), []);

  useEffect(() => { document.documentElement.dataset.theme = s.theme; }, [s.theme]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /**
   * Live logcat. Lines arrive far faster than React can render, so they are
   * buffered and flushed on an interval — one state update per flush instead of
   * one per line. Without this the whole UI re-renders hundreds of times a
   * second and everything (mirror included) grinds to a halt.
   */
  useEffect(() => {
    if (!s.connected) return undefined;
    let stop = null;
    let cancelled = false;
    let buffer = [];

    const flush = () => {
      if (!buffer.length) return;
      const batch = buffer;
      buffer = [];
      update((st) => (st.paused ? {} : { logs: st.logs.concat(batch).slice(-LIMITS.logs) }));
    };
    const timer = setInterval(flush, 250);

    webadb.streamLines('logcat -v brief', (line) => {
      const row = parseLogcat(line);
      if (row) buffer.push(row);
      // Hard cap so a log storm can't grow the buffer without bound.
      if (buffer.length > LIMITS.logs) buffer = buffer.slice(-LIMITS.logs);
    }).then((fn) => { stop = fn; if (cancelled) fn(); }, () => {});

    return () => { cancelled = true; clearInterval(timer); stop?.(); };
  }, [s.connected, update]);

  // Device telemetry sampling, only while the Performance tab is visible.
  const perfPrev = useRef(null);
  useEffect(() => {
    if (!s.connected || s.top !== 'perf') return undefined;
    let alive = true;
    perfPrev.current = null; // reset the CPU delta baseline each time the tab opens
    const tick = async () => {
      try {
        const text = await webadb.run(PERF_PROBE);
        if (!alive) return;
        const now = Date.now();
        const sample = parsePerf(text, perfPrev, now);
        update((st) => ({ perf: st.perf.concat({ t: now, ...sample }).slice(-LIMITS.perf) }));
      } catch { /* transient */ }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => { alive = false; clearInterval(id); };
  }, [s.connected, s.top, update]);

  /** This machine's LAN addresses, to suggest as the proxy host (e.g. Burp). */
  useEffect(() => {
    let cancelled = false;
    fetch(`/__loupe/info`)
      .then((r) => r.json())
      .then((info) => { if (!cancelled) set({ proxyHosts: info.addresses || [] }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [set]);

  // Elapsed counter for the record button.
  useEffect(() => {
    if (!s.recording) return undefined;
    const id = setInterval(() => update((st) => ({ recordSecs: st.recordSecs + 1 })), 1000);
    return () => clearInterval(id);
  }, [s.recording, update]);

  const actions = useMemo(() => {
    const toast = (text) => {
      clearTimeout(toastTimer.current);
      set({ toast: text });
      toastTimer.current = setTimeout(() => set({ toast: '' }), 2600);
    };

    /** Image previews hold a blob URL; drop it whenever the preview goes away. */
    const revokePreview = () => update((st) => {
      if (st.preview?.url) URL.revokeObjectURL(st.preview.url);
      return {};
    });

    /** Hands a blob to the user as a download. */
    const download = (blob, name) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      // ponytail: revoke on a timer, not immediately — Chrome aborts a large
      // download if the URL dies before it has read the blob.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    };

    const shellOut = (lines, kind = 'out') =>
      update((st) => ({ shell: st.shell.concat(lines.map((t) => ({ t, k: kind }))).slice(-LIMITS.shell) }));

    const loadFiles = async (path) => {
      if (!webadb.isConnected()) return;
      set({ filesBusy: true });
      revokePreview();
      try { set({ files: await webadb.listDir(path), path, filesBusy: false, fileSel: null, preview: null }); }
      catch (e) { set({ files: [], path, filesBusy: false }); toast(`ls ${path}: ${e.message}`); }
    };

    const loadApps = async (filter) => {
      if (!webadb.isConnected()) return;
      set({ appsBusy: true });
      const flag = filter === 'system' ? '-s' : filter === 'all' ? '' : '-3';
      try {
        const pkgs = parsePackages(await webadb.run(`pm list packages ${flag}`));
        set({ apps: pkgs, appsBusy: false });
        loadAppIcons(pkgs);
      } catch (e) { set({ apps: [], appsBusy: false }); toast('pm list packages failed: ' + e.message); }
    };

    // Real launcher icons: resolve each package's APK, pull the highest-density
    // raster ic_launcher (png/webp) out of it, and hand the row a data URL. Apps
    // whose icon is adaptive/vector only (no raster) resolve to '' and the row
    // shows its lettered badge instead. Runs a few at a time so the list stays
    // responsive, and every package is fetched at most once.
    const loadAppIcons = async (pkgs) => {
      // Each icon costs a few shell spawns; cap it so the 'all'/'system' filters
      // (hundreds of packages, most without a launcher icon) don't hammer the device.
      const todo = pkgs.filter((p) => !(p in appIconsRef.current)).slice(0, 80);
      todo.forEach((p) => { appIconsRef.current[p] = null; });   // mark in-flight
      const dpi = { xxxhdpi: 6, xxhdpi: 5, xhdpi: 4, hdpi: 3, tvdpi: 3, mdpi: 2, nodpi: 2, ldpi: 1 };
      // Prefer a real launcher raster, then the adaptive foreground, then any
      // app-icon / mipmap raster; higher density wins. Vector-only icons have no
      // candidate and fall back to the badge.
      const score = (e) => {
        let s = /ic_launcher_round\./i.test(e) ? 600
          : /ic_launcher\./i.test(e) ? 500
          : /ic_launcher_foreground\./i.test(e) ? 400
          : /app_?icon\./i.test(e) ? 300
          : /\/mipmap/i.test(e) ? 150 : 50;
        for (const [k, v] of Object.entries(dpi)) if (e.toLowerCase().includes(k)) s += v;
        return s;
      };
      const one = async (pkg) => {
        let url = '';
        try {
          const listCmd =
            `p=$(pm path ${pkg} 2>/dev/null | head -1 | sed 's/package://'); echo "$p"; ` +
            `unzip -l "$p" 2>/dev/null | grep -ioE '[^ ]+\\.(png|webp)' | grep -iE 'ic_launcher|app_?icon|/mipmap'`;
          const lines = (await webadb.run(listCmd)).split('\n').map((x) => x.trim()).filter(Boolean);
          const apk = lines.shift();
          const cand = lines.filter((e) => !/background/i.test(e)).sort((a, b) => score(b) - score(a));
          if (apk && cand[0]) {
            const b64 = (await webadb.run(`unzip -p "${apk}" "${cand[0]}" 2>/dev/null | base64 | tr -d '\\n'`)).trim();
            if (b64) url = `data:image/${b64.startsWith('UklGR') ? 'webp' : 'png'};base64,${b64}`;
          }
        } catch { /* leave blank → badge */ }
        appIconsRef.current[pkg] = url;
        update((st) => ({ appIcons: { ...st.appIcons, [pkg]: url } }));
      };
      // small pool: 4 in flight
      for (let i = 0; i < todo.length; i += 4) {
        if (!webadb.isConnected()) break;
        await Promise.all(todo.slice(i, i + 4).map(one));
      }
    };

    const loadDeviceInfo = async () => {
      if (!webadb.isConnected()) return;
      try { set({ deviceInfo: await webadb.deviceInfo() }); }
      catch (e) { toast('getprop failed: ' + e.message); }
    };

    const loadProcs = async () => {
      if (!webadb.isConnected()) return;
      set({ procsBusy: true });
      try { set({ procs: parseProcs(await webadb.run('ps -A -o PID,USER,RSS,%CPU,NAME')), procsBusy: false }); }
      catch (e) { set({ procs: [], procsBusy: false }); toast('ps failed: ' + e.message); }
    };

    const loadHierarchy = async () => {
      if (!webadb.isConnected()) { toast('No device connected'); return; }
      set({ insBusy: true });
      try {
        await webadb.run('uiautomator dump /sdcard/window_dump.xml');
        const xml = await webadb.run('cat /sdcard/window_dump.xml');
        const nodes = parseHierarchy(xml);
        set({ nodes, insSel: nodes[0]?.id ?? null, insBusy: false });
        if (!nodes.length) toast('uiautomator returned no nodes');
      } catch (e) {
        set({ nodes: [], insBusy: false });
        toast('uiautomator dump failed: ' + e.message);
      }
    };

    const loadNet = async () => {
      if (!webadb.isConnected()) return;
      set({ netBusy: true });
      try {
        let text = await webadb.run('ss -tunp');
        if (!text || text.split('\n').length < 2) text = await webadb.run('netstat -tunp');
        set({ net: parseSockets(text), netBusy: false });
      } catch (e) { set({ net: [], netBusy: false }); toast('ss/netstat failed: ' + e.message); }
    };

    const checkFrida = async () => {
      if (!webadb.isConnected()) return;
      set({ fridaBusy: true });
      try {
        const [pid, installed] = await Promise.all([
          webadb.fridaPid(),
          webadb.fridaInstalledVersion()
        ]);
        set({ frida: { running: !!pid, pid }, fridaInstalled: installed, fridaBusy: false });
      } catch {
        set({ frida: { running: false, pid: null }, fridaBusy: false });
      }
    };

    const fridaLog = (m) => update((st) => ({ fridaLog: st.fridaLog.concat('· ' + m).slice(-300) }));
    // Raw line (already prefixed) — for streamed script output.
    const fridaLine = (l) => update((st) => ({ fridaLog: st.fridaLog.concat(l).slice(-300) }));

    /**
     * Downloads a frida-server through the Node bridge and installs it.
     *
     * Always the newest release: the endpoint resolves `latest` itself on every
     * call and sends `Cache-Control: no-store`, so a version can't go stale here.
     */
    const installFrida = async () => {
      if (!webadb.isConnected()) { toast('No device connected'); return; }
      set({ fridaWorking: true, fridaLog: [] });
      try {
        const abi = s.deviceInfo?.flatMap((g) => g.rows).find((r) => r.k === 'abi')?.v
          || await webadb.run('getprop ro.product.cpu.abi').catch(() => 'arm64-v8a');
        fridaLog(`resolving the latest frida-server for ${abi.trim()}…`);

        const res = await fetch(
          `/__loupe/frida/server?abi=${encodeURIComponent(abi.trim())}`,
          { cache: 'no-store' }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `bridge said ${res.status}`);
        }
        const version = res.headers.get('X-Loupe-Version') || 'unknown';
        fridaLog(`downloading ${res.headers.get('X-Loupe-Name') || 'frida-server'}…`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        fridaLog(`got ${(bytes.length / 1048576).toFixed(1)} MB (v${version})`);

        await webadb.installFridaServer(bytes, fridaLog);
        toast(`frida-server ${version} installed`);
        checkFrida();
      } catch (e) {
        fridaLog('FAILED: ' + e.message);
        toast('frida install: ' + e.message);
      } finally { set({ fridaWorking: false }); }
    };

    const startFrida = async () => {
      set({ fridaWorking: true });
      try {
        const pid = await webadb.startFridaServer(fridaLog);
        set({ frida: { running: true, pid } });
        toast(`frida-server running · pid ${pid}`);
      } catch (e) {
        fridaLog('FAILED: ' + e.message);
        toast('frida start: ' + e.message);
      } finally { set({ fridaWorking: false }); checkFrida(); }
    };

    const stopFrida = async () => {
      set({ fridaWorking: true });
      try {
        await webadb.stopFridaServer();
        set({ frida: { running: false, pid: null } });
        fridaLog('stopped');
        toast('frida-server stopped');
      } catch (e) { toast('frida stop: ' + e.message); }
      finally { set({ fridaWorking: false }); checkFrida(); }
    };

    /**
     * Runs the script editor's contents through the bridge, which speaks Frida's
     * protocol to the device server and streams output back over a WebSocket.
     * Target is the app picked in the Frida panel (Spawn launches it; otherwise
     * it attaches to the running process).
     */
    const runScript = async () => {
      if (!webadb.isConnected()) { toast('No device connected'); return; }
      if (!s.frida?.running) { toast('Start frida-server first'); return; }
      const dev = webadb.currentDevice();
      const spawn = s.fridaSpawn;
      const target = (s.fridaTarget ?? '').trim();
      if (!target) { toast('Pick a target app first'); return; }

      // Each run starts with a fresh log so old output isn't mistaken for this run's.
      set({ fridaLog: [`▶ run: ${spawn ? 'spawn' : 'attach'} ${target}`] });

      // A link in the URL box (CodeShare / GitHub file / Gist) takes precedence
      // over the editor; the bridge fetches and normalises it to raw JS.
      let source = s.script;
      const link = (s.fridaUrl || '').trim();
      if (link) {
        fridaLine(`· fetching script from ${link}…`);
        try {
          const r = await fetch(
            `/__loupe/frida/script?url=${encodeURIComponent(link)}`,
            { signal: AbortSignal.timeout(20000) }
          );
          const j = await r.json();
          if (!j.ok) throw new Error(j.error || 'could not fetch that link');
          source = j.source;
          fridaLine(`· loaded ${source.length} chars`);
        } catch (e) {
          fridaLine(`  ✗ ${e.name === 'TimeoutError' ? 'timed out; is the dev server running?' : e.message}`);
          return;
        }
      }

      source = (source ?? '').toString();
      if (!source.trim()) {
        fridaLine('  ✗ nothing to run: paste a script in the editor, or a link in the URL box');
        return;
      }
      fridaLine(`· script ready (${source.length} chars)`);

      const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
      const url = `${wsProto}://${location.host}/__loupe/frida/session?serial=${encodeURIComponent(dev.serial)}`;
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';
      fridaWs.current = ws;

      // The proxy runs frida-node but has no path to the device; we do. Open an
      // ADB socket to frida-server (tcp:27042) and relay bytes over this same
      // WebSocket as binary frames, so Frida works on USB and Wi-Fi alike.
      let sock = null, writer = null;
      ws.onopen = async () => {
        try {
          sock = await webadb.openTcpSocket(27042);
        } catch (e) {
          fridaLine(`  ✗ tunnel to frida-server failed: ${e.message}`);
          try { ws.close(); } catch { /* gone */ } return;
        }
        writer = sock.writable.getWriter();
        // device → proxy: pump frida-server's bytes back over the socket.
        (async () => {
          const reader = sock.readable.getReader();
          try {
            for (;;) { const { value, done } = await reader.read(); if (done) break; if (ws.readyState === ws.OPEN) ws.send(value); }
          } catch { /* socket closed */ }
        })();
        // Spawn launches the package fresh; otherwise the bridge attaches by
        // matching the target's process name.
        ws.send(JSON.stringify({ source, target, spawn, pid: null }));
      };
      ws.onmessage = (ev) => {
        if (typeof ev.data !== 'string') { writer?.write(new Uint8Array(ev.data)); return; } // proxy → device
        let m; try { m = JSON.parse(ev.data); } catch { return; }
        if (m.type === 'log') fridaLine((m.kind === 'error' ? '  ✗ ' : m.kind === 'agent' ? '  » ' : '· ') + m.line);
        else if (m.type === 'message') fridaLine('  « ' + m.payload);
        else if (m.type === 'status' && m.status === 'running') set({ fridaRunning: true });
        else if (m.type === 'status' && m.status === 'script-destroyed') fridaLine('  (script destroyed)');
      };
      ws.onclose = () => {
        if (fridaWs.current === ws) fridaWs.current = null;
        try { writer?.close(); } catch { /* gone */ }
        try { sock?.close(); } catch { /* gone */ }
        set({ fridaRunning: false });
        fridaLine('▶ run ended');
      };
      ws.onerror = () => fridaLine('  ✗ socket error: is the proxy running?');
    };

    const stopScript = () => {
      try { fridaWs.current?.close(); } catch { /* gone */ }
      fridaWs.current = null;
      set({ fridaRunning: false });
    };

    const IMAGE_RE  = /\.(png|jpe?g|gif|webp|bmp|ico|svg)$/i;
    const HTML_RE   = /\.(html?|xhtml)$/i;
    const PDF_RE    = /\.pdf$/i;
    const AUDIO_RE  = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus)$/i;
    const VIDEO_RE  = /\.(mp4|webm|m4v|mov|3gp)$/i;
    const SQLITE_RE = /\.(sqlite3?|db3?)$/i;
    const TEXT_RE   = /\.(txt|log|xml|json|md|ini|conf|cfg|properties|csv|css|js|mjs|ts|java|kt|smali|sh|rc|yaml|yml|gradle|pro|sql|toml)$/i;
    const MIME = {
      png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif',
      webp:'image/webp', bmp:'image/bmp', ico:'image/x-icon', svg:'image/svg+xml',
      html:'text/html', htm:'text/html', xhtml:'application/xhtml+xml', pdf:'application/pdf',
      mp3:'audio/mpeg', wav:'audio/wav', ogg:'audio/ogg', oga:'audio/ogg', m4a:'audio/mp4',
      aac:'audio/aac', flac:'audio/flac', opus:'audio/ogg',
      mp4:'video/mp4', webm:'video/webm', m4v:'video/mp4', mov:'video/quicktime', '3gp':'video/3gpp'
    };
    const mimeOf = (n) => MIME[(n.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';

    // SQLite files start with the 16-byte string "SQLite format 3\0".
    const isSqliteMagic = (b) =>
      b && b.length >= 15 && new TextDecoder().decode(b.slice(0, 15)) === 'SQLite format 3';

    /** Reads + parses a database, then shows its tables. */
    const previewSqlite = async (full, name) => {
      const { readSqlite } = await import('./lib/sqlite.js');
      const { bytes, truncated } = await webadb.readAny(full, 64 * 1024 * 1024);
      const tables = await readSqlite(bytes);
      set({ preview: { kind: 'sqlite', tables, name, truncated }, previewBusy: false });
    };
    const joinPath = (dir, name) => (dir === '/' ? '' : dir) + '/' + name;

    /** Loads a preview for the selected file (image or text; binary shows size). */
    const selectFile = async (entry, dir = s.path) => {
      const [name, type, size] = entry;
      set({ fileSel: { name, type, size } });
      if (type === 'd') { set({ preview: null }); return; }

      revokePreview();
      set({ previewBusy: true, preview: null });
      const full = joinPath(dir, name);
      try {
        if (IMAGE_RE.test(name)) {
          const { bytes, truncated } = await webadb.readAny(full, 16 * 1024 * 1024);
          const url = URL.createObjectURL(new Blob([bytes], { type: mimeOf(name) }));
          set({ preview: { kind: 'image', url, name, truncated }, previewBusy: false });
        } else if (PDF_RE.test(name)) {
          const { bytes, truncated } = await webadb.readAny(full, 32 * 1024 * 1024);
          const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
          set({ preview: { kind: 'pdf', url, name, truncated }, previewBusy: false });
        } else if (AUDIO_RE.test(name) || VIDEO_RE.test(name)) {
          const media = AUDIO_RE.test(name) ? 'audio' : 'video';
          const { bytes, truncated } = await webadb.readAny(full, 64 * 1024 * 1024);
          const url = URL.createObjectURL(new Blob([bytes], { type: mimeOf(name) }));
          set({ preview: { kind: media, url, name, truncated }, previewBusy: false });
        } else if (HTML_RE.test(name)) {
          const { bytes, truncated } = await webadb.readAny(full, 2 * 1024 * 1024);
          const url = URL.createObjectURL(new Blob([bytes], { type: 'text/html' }));
          set({ preview: { kind: 'html', url, text: new TextDecoder().decode(bytes), name, truncated }, previewBusy: false });
        } else if (SQLITE_RE.test(name)) {
          await previewSqlite(full, name);
        } else if (TEXT_RE.test(name)) {
          const { bytes, truncated } = await webadb.readAny(full, 512 * 1024);
          set({
            preview: { kind: 'text', text: new TextDecoder().decode(bytes), name, truncated },
            previewBusy: false
          });
        } else {
          // Unknown extension: sniff the header for a database, else treat as binary.
          const head = await webadb.readAny(full, 16);
          if (isSqliteMagic(head.bytes)) await previewSqlite(full, name);
          else set({ preview: { kind: 'binary', name, size, truncated: false }, previewBusy: false });
        }
      } catch (e) {
        set({ preview: null, previewBusy: false });
        toast(`open ${name}: ${e.message}`);
      }
    };

    const downloadFile = async (entry) => {
      const [name, type] = entry;
      if (type === 'd') { toast('Pick a file, not a folder'); return; }
      const full = joinPath(s.path, name);
      set({ transfer: `Downloading ${name}…` });
      try {
        const { bytes, truncated } = await webadb.readAny(full, 512 * 1024 * 1024);
        download(new Blob([bytes]), name);
        toast(truncated ? `${name} downloaded (truncated)` : `${name} downloaded`);
      } catch (e) { toast(`pull ${name}: ${e.message}`); }
      finally { set({ transfer: '' }); }
    };

    const uploadFiles = async (fileList) => {
      if (!webadb.isConnected() || !fileList?.length) return;
      for (const file of fileList) {
        set({ transfer: `Uploading ${file.name}…` });
        try {
          await webadb.pushAny(joinPath(s.path, file.name), file, (sent, total) => {
            set({ transfer: `Uploading ${file.name}: ${Math.round((sent / total) * 100)}%` });
          });
        } catch (e) { toast(`push ${file.name}: ${e.message}`); }
      }
      set({ transfer: '' });
      toast('Upload complete');
      loadFiles(s.path);
    };

    /** Recursive search from the current directory. */
    const searchFiles = async (query) => {
      const q = String(query || '').trim();
      if (!q) { set({ findResults: null }); return; }
      if (!webadb.isConnected()) { toast('No device connected'); return; }
      set({ findBusy: true, findRoot: s.path });
      try {
        const rows = await webadb.findFiles(s.path, q);
        set({ findResults: rows, findBusy: false });
        toast(rows.length ? `${rows.length} match${rows.length === 1 ? '' : 'es'}` : 'No matches');
      } catch (e) {
        set({ findResults: [], findBusy: false });
        toast('find: ' + e.message);
      }
    };

    const clearSearch = () => set({ findResults: null, findRoot: '' });

    /** Opens a search hit: folders navigate, files open their folder + preview. */
    const revealPath = async (fullPath, kind) => {
      if (kind === 'd') { set({ findResults: null }); loadFiles(fullPath); return; }
      const idx = fullPath.lastIndexOf('/');
      const dir = idx <= 0 ? '/' : fullPath.slice(0, idx);
      const name = fullPath.slice(idx + 1);
      revokePreview();
      set({ filesBusy: true });
      try {
        const files = await webadb.listDir(dir);
        set({ files, path: dir, filesBusy: false, findResults: null, fileSel: null, preview: null });
        const entry = files.find((f) => f[0] === name);
        if (entry) selectFile(entry, dir);
      } catch (e) {
        set({ filesBusy: false });
        toast(`open ${dir}: ${e.message}`);
      }
    };

    const deleteEntry = async (entry) => {
      const [name, type] = entry;
      const full = joinPath(s.path, name);
      set({ transfer: `Deleting ${name}…` });
      try {
        await webadb.removePath(full, type === 'd');
        set({ fileSel: null, preview: null });
        toast(`Deleted ${name}`);
        loadFiles(s.path);
      } catch (e) { toast(`rm ${name}: ${e.message}`); }
      finally { set({ transfer: '' }); }
    };

    const pasteHere = async () => {
      const clip = s.clipboard;
      if (!clip) { toast('Clipboard is empty'); return; }
      const dst = joinPath(s.path, clip.name);
      set({ transfer: `${clip.op === 'cut' ? 'Moving' : 'Copying'} ${clip.name}…` });
      try {
        if (clip.op === 'cut') await webadb.movePath(clip.path, dst);
        else await webadb.copyPath(clip.path, dst);
        toast(`${clip.op === 'cut' ? 'Moved' : 'Copied'} ${clip.name}`);
        set({ clipboard: clip.op === 'cut' ? null : clip });
        loadFiles(s.path);
      } catch (e) { toast(`paste: ${e.message}`); }
      finally { set({ transfer: '' }); }
    };

    const newFolder = async (name) => {
      if (!name) return;
      try { await webadb.makeDir(joinPath(s.path, name)); loadFiles(s.path); toast('Created ' + name); }
      catch (e) { toast('mkdir: ' + e.message); }
    };

    // ---- apps ----
    const showAppInfo = async (pkg) => {
      set({ appSel: pkg, appInfo: null, appInfoBusy: true });
      try { set({ appInfo: await webadb.packageInfo(pkg), appInfoBusy: false }); }
      catch (e) { set({ appInfoBusy: false }); toast('dumpsys: ' + e.message); }
    };

    /** Jumps the Files panel to a path, explaining clearly if it's not readable. */
    const browseTo = async (path) => {
      set({ bottom: 'files', bottomOpen: true });
      try {
        const files = await webadb.listDir(path);
        set({ files, path, fileSel: null, preview: null });
        toast('Opened ' + path);
      } catch (e) {
        if (/permission|denied|EACCES/i.test(e.message)) {
          const root = await webadb.detectRoot();
          if (root) {
            webadb.setRootMode(true);
            set({ rootMode: true, rootAvailable: true });
            try {
              const files = await webadb.listDir(path);
              set({ files, path, fileSel: null, preview: null });
              toast('Opened ' + path + ' (root)');
              return;
            } catch (e2) { toast(`${path}: ${e2.message}`); return; }
          }
          toast(`${path} needs root. This device's shell user can't read it.`);
        } else {
          toast(`open ${path}: ${e.message}`);
        }
      }
    };

    const uninstallApp = async (pkg) => {
      set({ transfer: `Uninstalling ${pkg}…` });
      try {
        const out = await webadb.run(`pm uninstall ${pkg}`);
        if (!/success/i.test(out)) throw new Error(out.trim() || 'pm uninstall failed');
        // Drop it from the list immediately, then re-read to stay honest.
        update((st) => ({
          apps: st.apps.filter((p) => p !== pkg),
          appSel: st.appSel === pkg ? null : st.appSel,
          appInfo: st.appSel === pkg ? null : st.appInfo
        }));
        toast('Uninstalled ' + pkg);
        loadApps(s.appFilter);
      } catch (e) {
        toast('uninstall failed: ' + e.message);
      } finally { set({ transfer: '' }); }
    };

    /** `pm clear`: wipes an app's data and cache (works without root). */
    const clearAppData = async (pkg) => {
      try {
        const out = await webadb.run(`pm clear ${pkg}`);
        if (!/success/i.test(out)) throw new Error(out.trim() || 'pm clear failed');
        toast('Cleared data for ' + pkg);
      } catch (e) { toast('clear data failed: ' + e.message); }
    };

    /** Cache-only wipe. No pm command does this per-app, so it needs root. */
    const clearAppCache = async (pkg) => {
      if (!s.rootAvailable) { toast('Clearing cache alone needs root — use Clear data instead'); return; }
      try {
        await webadb.sh(`rm -rf /data/data/${pkg}/cache/* /data/data/${pkg}/code_cache/*`);
        toast('Cleared cache for ' + pkg);
      } catch (e) { toast('clear cache failed: ' + e.message); }
    };

    /** Enable or disable a package (`pm enable` / `pm disable-user`). */
    const setAppEnabled = async (pkg, enabled) => {
      try {
        const out = await webadb.run(enabled ? `pm enable ${pkg}` : `pm disable-user --user 0 ${pkg}`);
        if (!/new state/i.test(out)) throw new Error(out.trim() || 'pm failed');
        toast(`${enabled ? 'Enabled' : 'Disabled'} ${pkg}`);
        showAppInfo(pkg);   // refresh so the toggle flips to the new state
      } catch (e) { toast(`${enabled ? 'enable' : 'disable'} failed: ` + e.message); }
    };

    // ---- settings editor ----
    const loadSettings = async (ns) => {
      set({ settingsNs: ns, settings: [], settingsBusy: true, settingsSel: null, settingsVal: '' });
      try {
        const out = await webadb.run(`settings list ${ns}`);
        const rows = out.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
          const i = l.indexOf('=');
          return i < 0 ? { k: l, v: '' } : { k: l.slice(0, i), v: l.slice(i + 1) };
        }).sort((a, b) => a.k.localeCompare(b.k));
        set({ settings: rows, settingsBusy: false });
      } catch (e) { set({ settingsBusy: false }); toast('settings list: ' + e.message); }
    };

    const putSetting = async (ns, key, val) => {
      if (!key) return;
      // Single-quote the value so spaces and shell metacharacters stay literal.
      const arg = `'${String(val).replace(/'/g, `'\\''`)}'`;
      try {
        await webadb.run(`settings put ${ns} ${key} ${arg}`);
        toast(`set ${ns}/${key}`);
        update((st) => ({ settings: st.settings.map((r) => (r.k === key ? { ...r, v: val } : r)) }));
      } catch (e) { toast('settings put: ' + e.message); }
    };

    const deleteSetting = async (ns, key) => {
      if (!key) return;
      try {
        await webadb.run(`settings delete ${ns} ${key}`);
        toast(`deleted ${ns}/${key}`);
        update((st) => ({ settings: st.settings.filter((r) => r.k !== key), settingsSel: null, settingsVal: '' }));
      } catch (e) { toast('settings delete: ' + e.message); }
    };

    const installApk = async (file) => {
      if (!file) return;
      set({ installBusy: true });
      const step = (m) => shellOut(['· ' + m], 'dim');
      try {
        const out = await webadb.installApk(file, step);
        toast('Installed: ' + out);
        loadApps(s.appFilter);
      } catch (e) {
        shellOut(['· install FAILED: ' + e.message], 'dim');
        toast('Install failed: see the shell.');
      } finally { set({ installBusy: false }); }
    };

    // Same-origin: Vite proxies /__loupe to the bridge, so no second port.
    const proxyBase = '';

    // ---- Proxy tab ----
    // Each action starts its log fresh (like the Frida run log), then appends.
    const proxyLogStart = (m) => set({ proxyLog: ['· ' + m] });
    const proxyLog = (m) => update((st) => ({ proxyLog: st.proxyLog.concat('· ' + m).slice(-200) }));

    /** Read the device's current global HTTP proxy so the UI reflects reality. */
    const refreshDeviceProxy = async () => {
      if (!webadb.isConnected()) return;
      try {
        const v = (await webadb.run('settings get global http_proxy')).trim();
        set({ devProxyLive: (v && v !== 'null' && v !== ':0') ? v : '' });
      } catch { /* ignore */ }
    };

    /** Point the device's global HTTP proxy at the user's proxy (Burp, etc.). */
    const setDeviceProxy = async () => {
      if (!webadb.isConnected()) { toast('No device connected'); return; }
      const host = s.devProxyHost.trim();
      const port = s.devProxyPort.trim();
      if (!host || !port) { toast('Enter a proxy host and port'); return; }
      try {
        await webadb.run(`settings put global http_proxy ${host}:${port}`);
        proxyLogStart(`global http_proxy → ${host}:${port}`);
        toast(`Device proxy → ${host}:${port}`);
        refreshDeviceProxy();
      } catch (e) { toast('set proxy failed: ' + e.message); }
    };

    const clearDeviceProxy = async () => {
      if (!webadb.isConnected()) return;
      try {
        // `:0` is the documented "no proxy" value, but some ROMs also keep the
        // legacy host/port keys — wipe those too or the proxy sticks around.
        await webadb.run(
          'settings put global http_proxy :0; ' +
          'settings delete global global_http_proxy_host 2>/dev/null; ' +
          'settings delete global global_http_proxy_port 2>/dev/null; ' +
          'settings delete global global_http_proxy_exclusion_list 2>/dev/null; true'
        );
        proxyLogStart('global http_proxy cleared');
        toast('Device proxy cleared');
        refreshDeviceProxy();
      } catch (e) { toast('clear proxy failed: ' + e.message); }
    };

    /**
     * Check the proxy is actually accepting connections at host:port. Tested from
     * the bridge (this machine) with a raw TCP connect — reliable and tool-free,
     * unlike the device shell (no curl on most Androids). For a phone on the same
     * LAN pointing at this machine's LAN IP, this is the phone's own path.
     */
    const testProxy = async () => {
      const host = s.devProxyHost.trim();
      const port = s.devProxyPort.trim();
      if (!host || !port) { toast('Enter a proxy host and port'); return; }
      proxyLogStart(`testing ${host}:${port}…`);
      try {
        const r = await fetch(`/__loupe/proxy/test?host=${encodeURIComponent(host)}&port=${encodeURIComponent(port)}`);
        const j = await r.json();
        if (j.ok) {
          proxyLog(`✓ ${host}:${port} is accepting connections`);
          if (/^(127\.|localhost$|::1$)/.test(host)) proxyLog('note: this is loopback — the phone can’t reach it unless you use adb reverse; point it at a LAN IP instead');
        } else {
          proxyLog(`✗ can’t reach ${host}:${port} (${j.error || 'no connection'}) — is your proxy running and listening on all interfaces, not only 127.0.0.1?`);
        }
      } catch (e) { proxyLog('✗ ' + e.message); }
    };

    /** Verify our CA is present in the (mounted) system store. */
    const checkCert = async () => {
      if (!webadb.isConnected() || !s.certHash) return;
      try {
        const out = await webadb.sh(`ls /system/etc/security/cacerts/${s.certHash}.0 2>/dev/null`);
        set({ certInstalled: out.includes(`${s.certHash}.0`) });
      } catch { /* ignore */ }
    };

    // Injects the store on both the /system and /apex conscrypt cacerts dirs.
    // Used at boot (as a module's post-fs-data.sh) and once at install time. The
    // module's own certs live in $MODDIR/cacerts; merged with the stock certs
    // into a tmpfs so nothing stock is lost. SELinux context must be restored or
    // the certs are ignored. `$0`'s dir is the module when run at boot.
    const CACERTS_BOOT_SCRIPT = [
      '#!/system/bin/sh',
      'MODDIR=${0%/*}',
      'CERTS="$MODDIR/cacerts"',
      '[ -d "$CERTS" ] || exit 0',
      'S=/dev/loupe-cacerts; rm -rf "$S"; mkdir -p "$S"',
      'cp /system/etc/security/cacerts/* "$S/" 2>/dev/null',
      'cp "$CERTS"/* "$S/" 2>/dev/null',
      'chown 0:0 "$S"/* 2>/dev/null; chmod 644 "$S"/* 2>/dev/null',
      'chcon u:object_r:system_security_cacerts_file:s0 "$S"/* 2>/dev/null',
      'for D in /system/etc/security/cacerts /apex/com.android.conscrypt/cacerts; do',
      '  [ -d "$D" ] || continue',
      '  mount -t tmpfs tmpfs "$D" 2>/dev/null',
      '  cp "$S"/* "$D/" 2>/dev/null',
      '  chown 0:0 "$D"/* 2>/dev/null; chmod 644 "$D"/* 2>/dev/null',
      '  chcon u:object_r:system_security_cacerts_file:s0 "$D"/* 2>/dev/null',
      'done',
      ''
    ].join('\n');

    /**
     * Install a proxy CA into the system trust store so HTTPS interception works.
     * The host's openssl turns the upload into the PEM and Android hash name; then,
     * on a Magisk/KernelSU device, we write a boot module that re-applies the store
     * on every boot (persistent). Without a module manager we fall back to a
     * one-shot tmpfs mount that resets on reboot.
     */
    const installCert = async (file) => {
      if (!file) return;
      if (!webadb.isConnected()) { toast('No device connected'); return; }
      if (!s.rootAvailable) { toast('Root is required to install a system CA'); return; }
      set({ certBusy: true, certName: file.name });
      proxyLogStart(`preparing ${file.name}…`);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const res = await fetch(`${proxyBase}/__loupe/cert/prepare`, { method: 'POST', body: bytes });
        const j = await res.json();
        if (!j.ok) throw new Error(j.error || 'could not read that certificate');
        const { pem, hash } = j;
        set({ certHash: hash });
        proxyLog(`subject hash ${hash}`);

        const hasModules = /YES/.test(await webadb.sh('test -d /data/adb/modules && echo YES || echo NO'));
        let out;
        if (hasModules) {
          const prop = [
            'id=loupe-cacerts', 'name=Loupe System CA Certificates',
            'version=v1', 'versionCode=1', 'author=Loupe',
            'description=Injects user CA certificates into the system and APEX trust stores on every boot.', ''
          ].join('\n');
          // Everything is base64 so it passes through the su shell untouched.
          out = await webadb.sh(
            'MOD=/data/adb/modules/loupe-cacerts; mkdir -p $MOD/cacerts; ' +
            `printf %s '${btoa(pem)}' | base64 -d > $MOD/cacerts/${hash}.0; chmod 644 $MOD/cacerts/${hash}.0; ` +
            `printf %s '${btoa(prop)}' | base64 -d > $MOD/module.prop; ` +
            `printf %s '${btoa(CACERTS_BOOT_SCRIPT)}' | base64 -d > $MOD/post-fs-data.sh; chmod 755 $MOD/post-fs-data.sh; ` +
            'sh $MOD/post-fs-data.sh; ' +   // apply now, too
            `ls /system/etc/security/cacerts/${hash}.0 2>/dev/null && echo INSTALLED || echo FAILED`
          );
          if (!/INSTALLED/.test(out)) throw new Error('writing the CA boot module failed');
          proxyLog(`installed ${hash}.0 as a boot module — persists across reboots`);
          toast('CA installed persistently (survives reboot)');
        } else {
          out = await webadb.sh(
            `HASH=${hash}; TMP=/data/local/tmp/loupe-cacerts; rm -rf $TMP; mkdir -p $TMP; ` +
            'cp /system/etc/security/cacerts/* $TMP/ 2>/dev/null; ' +
            'cp /apex/com.android.conscrypt/cacerts/* $TMP/ 2>/dev/null; ' +
            `printf %s '${btoa(pem)}' | base64 -d > $TMP/$HASH.0; ` +
            'chown 0:0 $TMP/* 2>/dev/null; chmod 644 $TMP/* 2>/dev/null; ' +
            'chcon u:object_r:system_security_cacerts_file:s0 $TMP/* 2>/dev/null; ' +
            'for D in /system/etc/security/cacerts /apex/com.android.conscrypt/cacerts; do ' +
            '[ -d $D ] || continue; mount -t tmpfs tmpfs $D 2>/dev/null; cp $TMP/* $D/ 2>/dev/null; ' +
            'chmod 644 $D/* 2>/dev/null; chcon u:object_r:system_security_cacerts_file:s0 $D/* 2>/dev/null; done; ' +
            'ls /system/etc/security/cacerts/$HASH.0 2>/dev/null && echo INSTALLED || echo FAILED'
          );
          if (!/INSTALLED/.test(out)) throw new Error('mount/copy into the system store failed');
          proxyLog(`installed ${hash}.0 into the system store (until reboot — no Magisk/KernelSU module manager found)`);
          toast('CA installed (until reboot)');
        }
        set({ certInstalled: true });
      } catch (e) { proxyLog('✗ ' + e.message); toast('cert install failed: ' + e.message); }
      finally { set({ certBusy: false }); }
    };

    const removeCert = async () => {
      if (!webadb.isConnected()) return;
      try {
        await webadb.sh(
          'rm -rf /data/adb/modules/loupe-cacerts 2>/dev/null; ' +
          'umount /system/etc/security/cacerts 2>/dev/null; ' +
          'umount /apex/com.android.conscrypt/cacerts 2>/dev/null; echo done'
        );
        set({ certInstalled: false });
        proxyLogStart('removed the CA boot module and unmounted the live store');
        toast('CA removed');
      } catch (e) { toast('remove failed: ' + e.message); }
    };


    // ---- memory ----
    const memSnapshot = async (pid, pkg) => {
      if (!webadb.isConnected()) { toast('No device connected'); return; }
      set({ memBusy: true, memText: '', memLabel: `meminfo ${pkg || pid}` });
      try {
        const out = await webadb.sh(`dumpsys meminfo ${pid || pkg}`);
        set({ memText: out, memBusy: false });
      } catch (e) { set({ memBusy: false }); toast('meminfo: ' + e.message); }
    };

    const memMaps = async (pid) => {
      set({ memBusy: true, memText: '', memLabel: `/proc/${pid}/maps` });
      try {
        const out = await webadb.sh(`cat /proc/${pid}/maps`);
        set({ memText: out, memBusy: false });
        if (/permission|denied/i.test(out)) toast('maps needs root for other processes');
      } catch (e) { set({ memBusy: false }); toast('maps: ' + e.message); }
    };

    /** Reads /proc/<pid>/mem and packages it as an ELF core. Needs root. */
    const captureCore = async (pid, pkg, step, lines) => {
      const { bytes, regions, abi, truncated, scanned } = await webadb.dumpProcessMemory(pid, {
        filter: s.memRegionQ.trim(),
        maxBytes: Math.max(1, s.memCapMB) * 1024 * 1024,
        onStep: step
      });
      step(`building ELF core (${abi})…`);
      const { machine, bits } = machineFor(abi);
      const core = buildCore({ regions, data: bytes, machine, bits });
      const base = `${String(pkg || pid).replace(/[^\w.-]+/g, '_')}-${pid}`;
      download(new Blob([core], { type: 'application/x-coredump' }), `${base}.core`);
      return lines.concat([
        '',
        `Wrote ${base}.core: ELF ${bits}-bit core, ${regions.length}/${scanned} regions, ` +
          `${(core.length / 1048576).toFixed(1)} MB${truncated ? ' (capped)' : ''}.`,
        '',
        'Open it with:',
        `  gdb -c ${base}.core`,
        `  r2 ${base}.core`,
        '  Ghidra: File → Import (ELF core)'
      ]).join('\n');
    };

    /**
     * Captures process memory, using the best method that actually works:
     * an .hprof via `am dumpheap` when the app is debuggable, otherwise an ELF
     * core read from /proc/<pid>/mem. The fallback is automatic — a release
     * build shouldn't be a dead end.
     */
    const dumpHeap = async (pid, pkg) => {
      if (!webadb.isConnected()) { toast('No device connected'); return; }
      set({ memBusy: true, memLabel: `memory capture ${pkg || pid}`, memText: '' });
      const lines = [];
      const step = (m) => { lines.push('· ' + m); set({ memText: lines.join('\n') }); };

      try {
        step('trying am dumpheap (.hprof)…');
        const bytes = await webadb.dumpHeap(pid, pkg, step);
        const base = `${String(pkg || pid).replace(/[^\w.-]+/g, '_')}`;
        download(new Blob([bytes], { type: 'application/octet-stream' }), `${base}.hprof`);
        set({
          memBusy: false,
          memText: lines.concat(['', `Wrote ${base}.hprof (${(bytes.length / 1048576).toFixed(1)} MB).`]).join('\n')
        });
        toast('Heap dump downloaded');
        return;
      } catch (e) {
        step(`hprof unavailable: ${e.message}`);

        const rooted = s.rootMode || (await webadb.detectRoot());
        if (!rooted) {
          set({
            memBusy: false,
            memText: lines.concat([
              '',
              'No fallback available: an ELF core needs root, and this device',
              'has no root shell. Enable root and retry.'
            ]).join('\n')
          });
          toast('Not debuggable, and no root for the fallback');
          return;
        }

        webadb.setRootMode(true);
        set({ rootMode: true, rootAvailable: true });
        step('falling back to ELF core dump from /proc/<pid>/mem…');
        try {
          const text = await captureCore(pid, pkg, step, lines);
          set({ memBusy: false, memText: text });
          toast('Captured as ELF core');
        } catch (e2) {
          set({ memBusy: false, memText: lines.concat(['', 'core dump failed:', e2.message]).join('\n') });
          toast('core dump: ' + e2.message);
        }
      }
    };

    /** Core dump on demand, skipping the hprof attempt entirely. */
    const dumpMemory = async (pid, pkg) => {
      if (!webadb.isConnected()) { toast('No device connected'); return; }
      if (!s.rootMode) { toast('Enable root mode first'); return; }
      set({ memBusy: true, memLabel: `core dump ${pkg || pid}`, memText: '' });
      const lines = [];
      const step = (m) => { lines.push('· ' + m); set({ memText: lines.join('\n') }); };
      try {
        const text = await captureCore(pid, pkg, step, lines);
        set({ memBusy: false, memText: text });
        toast('Core dumped');
      } catch (e) {
        set({ memBusy: false, memText: lines.concat(['', 'core dump failed:', e.message]).join('\n') });
        toast('core dump: ' + e.message);
      }
    };

    const saveMemText = () => {
      if (!s.memText) return;
      download(new Blob([s.memText], { type: 'text/plain' }),
        `${(s.memLabel || 'memory').replace(/[^\w.-]+/g, '_')}.txt`);
      toast('Saved');
    };

    /** Turns elevated (su) mode on or off for shell + file operations. */
    const toggleRoot = async () => {
      if (!webadb.isConnected()) { toast('No device connected'); return; }
      if (s.rootMode) {
        webadb.setRootMode(false);
        set({ rootMode: false });
        toast('Root mode off');
        loadFiles(s.path);
        return;
      }
      set({ rootBusy: true });
      const ok = await webadb.detectRoot();
      webadb.setRootMode(ok);
      set({ rootMode: ok, rootAvailable: ok, rootBusy: false });
      toast(ok ? 'Root mode on' : 'su denied: device is not rooted for shell');
      if (ok) loadFiles(s.path);
    };

    // Filter logcat to one app: resolve its running pids so filterLogs can match.
    const setLogApp = async (pkg) => {
      set({ logApp: pkg, logAppOpen: false, logAppPids: [] });
      if (!pkg || !webadb.isConnected()) return;
      try {
        const out = await webadb.run(`pidof ${pkg}`);
        const pids = String(out).trim().split(/\s+/).map(Number).filter(Number.isFinite);
        set({ logAppPids: pids });
      } catch { set({ logAppPids: [] }); }
    };

    // Stop recording and save whatever was captured. Shared by the record toggle
    // and mirror teardown so stopping the mirror (or disconnecting) never silently
    // drops an in-progress recording.
    const finishRecording = async () => {
      if (!record.isRecording()) return;
      const blob = await record.stopRecording().catch(() => null);
      if (!blob) { toast('Nothing was recorded'); return; }
      const ext = record.extensionFor(blob.type);
      download(blob, `loupe-recording-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`);
      toast(`Recording saved (${(blob.size / 1048576).toFixed(1)} MB)`);
    };

    return {
      set, update, toast, shellOut, download, loadFiles, loadApps, loadProcs, loadHierarchy,
      loadDeviceInfo, setLogApp,
      loadNet, checkFrida, installFrida, startFrida, stopFrida, runScript, stopScript,
      selectFile, downloadFile, uploadFiles, deleteEntry, pasteHere, newFolder,
      searchFiles, clearSearch, revealPath,
      copyEntry: (entry) => {
        const full = (s.path === '/' ? '' : s.path) + '/' + entry[0];
        set({ clipboard: { path: full, name: entry[0], op: 'copy' } });
        toast('Copied ' + entry[0]);
      },
      cutEntry: (entry) => {
        const full = (s.path === '/' ? '' : s.path) + '/' + entry[0];
        set({ clipboard: { path: full, name: entry[0], op: 'cut' } });
        toast('Cut ' + entry[0]);
      },
      showAppInfo, installApk, uninstallApp, clearAppData, clearAppCache, setAppEnabled,
      loadSettings, putSetting, deleteSetting, browseTo, toggleRoot,
      isRecording: record.isRecording,
      setDeviceProxy, clearDeviceProxy, refreshDeviceProxy, testProxy, installCert, removeCert, checkCert,
      memSnapshot, memMaps, dumpHeap, dumpMemory, saveMemText,

      toggleTheme: () => update((st) => ({ theme: st.theme === 'dark' ? 'light' : 'dark' })),

      /**
       * QR pairing (Android 11+).
       *
       * The QR carries a service name and password. After scanning, the phone
       * advertises `_adb-tls-pairing._tcp` under that name; we discover it with
       * `adb mdns services` and pair using the QR's password — the same
       * handshake `adb pair` performs with a typed code.
       */
      startQr: () => {
        const rand = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)))
          .map((b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
        const name = `loupe-${rand(6)}`;
        const password = rand(12);
        const qr = { name, password, payload: `WIFI:T:ADB;S:${name};P:${password};;` };
        set({ qr, wifiTab: 'qr', wifiLog: ['· waiting for the phone to scan…'], wifiBusy: true });

        let cancelled = false;
        qrCancel.current = () => { cancelled = true; };

        (async () => {
          const deadline = Date.now() + 120000;
          while (!cancelled && Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, 2000));
            let services = [];
            try { services = await webadb.wireless.listMdns(); } catch { /* retry */ }
            const hit = services.find(
              (x) => x.type.includes('adb-tls-pairing') && x.name.includes(name)
            );
            if (!hit) continue;

            update((st) => ({ wifiLog: st.wifiLog.concat(`· phone offered ${hit.addr}: pairing…`) }));
            try {
              const r = await webadb.wireless.pair(hit.addr, password);
              update((st) => ({ wifiLog: st.wifiLog.concat('· ' + (r.output || '')) }));
              if (!r.ok) throw new Error(r.output || 'pairing failed');

              const host = hit.addr.split(':')[0];
              const conn = (await webadb.wireless.listMdns())
                .find((x) => x.type.includes('adb-tls-connect') && x.addr.startsWith(host + ':'));
              const c = await webadb.wireless.connectTcp(conn ? conn.addr : `${host}:5555`);
              update((st) => ({ wifiLog: st.wifiLog.concat('· ' + (c.output || '')) }));
              toast('Paired via QR');
              actions.refreshWireless();
            } catch (e) {
              update((st) => ({ wifiLog: st.wifiLog.concat('· FAILED: ' + e.message) }));
              toast('QR pair: ' + e.message);
            }
            set({ wifiBusy: false, qr: null });
            return;
          }
          if (!cancelled) {
            update((st) => ({ wifiLog: st.wifiLog.concat('· timed out waiting for a scan') }));
            set({ wifiBusy: false });
          }
        })();
      },

      cancelQr: () => { qrCancel.current?.(); set({ qr: null, wifiBusy: false }); },

      /** ---- wireless ---- */
      wifiLog: (msg) => update((st) => ({ wifiLog: st.wifiLog.concat(msg).slice(-40) })),

      killAdbServer: async () => {
        try {
          const r = await webadb.wireless.killServer();
          set({ wifiDevices: [] });
          toast(r.output || 'adb server stopped');
        } catch (e) { toast('kill-server: ' + e.message); }
      },

      refreshWireless: async () => {
        try {
          const [devices, services] = await Promise.all([
            webadb.wireless.listDevices(),
            webadb.wireless.listMdns()
          ]);
          set({ wifiDevices: devices.filter((d) => d.serial.includes(':')) });
        } catch (e) { toast('bridge: ' + e.message); }
      },

      pairWithCode: async () => {
        const addr = s.pairAddr.trim();
        const code = s.pairCode.trim();
        if (!/^\S+:\d+$/.test(addr)) { toast('Pairing address looks like 192.168.1.42:37013'); return; }
        if (!/^\d{6}$/.test(code)) { toast('The pairing code is 6 digits'); return; }
        set({ wifiBusy: true, wifiLog: [`· adb pair ${addr}…`] });
        try {
          const r = await webadb.wireless.pair(addr, code);
          update((st) => ({ wifiLog: st.wifiLog.concat('· ' + (r.output || '')) }));
          if (!r.ok) throw new Error(r.output || 'pairing failed');
          // Pairing port differs from the connect port; find the real one.
          update((st) => ({ wifiLog: st.wifiLog.concat('· paired: looking for the connect port…') }));
          const host = addr.split(':')[0];
          const svc = (await webadb.wireless.listMdns())
            .find((x) => x.type.includes('adb-tls-connect') && x.addr.startsWith(host + ':'));
          const target = svc ? svc.addr : `${host}:5555`;
          const c = await webadb.wireless.connectTcp(target);
          update((st) => ({ wifiLog: st.wifiLog.concat('· ' + (c.output || '')) }));
          set({ wifiBusy: false, pairCode: '' });
          toast(c.ok ? 'Paired and connected' : 'Paired: connect failed, try Connect tab');
          actions.refreshWireless();
        } catch (e) {
          update((st) => ({ wifiLog: st.wifiLog.concat('· FAILED: ' + e.message) }));
          set({ wifiBusy: false });
          toast('pair: ' + e.message);
        }
      },

      connectWifiAddr: async () => {
        const addr = s.connectAddr.trim();
        if (!/^\S+(:\d+)?$/.test(addr)) { toast('Address looks like 192.168.1.42:5555'); return; }
        set({ wifiBusy: true, wifiLog: [`· adb connect ${addr}…`] });
        try {
          const r = await webadb.wireless.connectTcp(addr.includes(':') ? addr : `${addr}:5555`);
          update((st) => ({ wifiLog: st.wifiLog.concat('· ' + (r.output || '')) }));
          set({ wifiBusy: false });
          toast(r.ok ? 'Connected' : (r.output || 'connect failed'));
          actions.refreshWireless();
        } catch (e) {
          set({ wifiBusy: false });
          toast('connect: ' + e.message);
        }
      },

      /** Attaches Loupe to a wireless device the bridge already has. */
      useWirelessDevice: async (serial) => {
        set({ devOpen: false, bottom: 'shell', bottomOpen: true, wifiBusy: true });
        const step = (m) => shellOut(['· ' + m], 'dim');
        try {
          const dev = await webadb.connectWireless(serial, step);
          appIconsRef.current = {};
          set({ connected: true, device: dev, logs: [], appIcons: {}, logApp: '', logAppPids: [], devProxyHost: '127.0.0.1', wifiBusy: false, top: 'info', topOpen: true, bottom: 'shell', paused: true, procSort: 'pid', procDir: 'desc' });
          toast('Connected · ' + dev.model);
          webadb.detectRoot().then((root) => {
            webadb.setRootMode(root);
            set({ rootAvailable: root, rootMode: root });
            if (root) toast('Root detected: elevated mode on');
          }).catch(() => {});
          loadDeviceInfo();
          loadFiles('/sdcard'); loadApps('user'); loadProcs();
        } catch (e) {
          set({ wifiBusy: false });
          step('FAILED: ' + e.message);
          toast('wireless connect failed: see the shell');
        }
      },

      connectUsb: async () => {
        if (!webadb.usbSupported()) { toast('WebUSB needs Chrome or Edge.'); return; }
        set({ devOpen: false, bottom: 'shell', bottomOpen: true });
        const step = (msg) => shellOut(['· ' + msg], 'dim');
        try {
          const dev = await webadb.pickAndConnect(step);
          if (!dev) { step('picker dismissed'); return; }
          appIconsRef.current = {};
          set({ connected: true, device: dev, logs: [], appIcons: {}, logApp: '', logAppPids: [], devProxyHost: '127.0.0.1', top: 'info', topOpen: true, bottom: 'shell', paused: true, procSort: 'pid', procDir: 'desc' });
          toast('Connected · ' + dev.model);
          // A rooted device unlocks /data/data browsing, other-process maps and
          // heap dumps — detect it up front and switch on automatically.
          webadb.detectRoot().then((root) => {
            webadb.setRootMode(root);
            set({ rootAvailable: root, rootMode: root });
            if (root) toast('Root detected: elevated mode on');
          }).catch(() => {});
          loadDeviceInfo();
          loadFiles('/sdcard');
          loadApps('user');
          loadProcs();
        } catch (e) {
          step('FAILED: ' + e.message);
          toast('Connect failed: see the shell.');
        }
      },

      // Covers both transports: closing the Adb instance tears down its streams
      // either way. For Wi-Fi we deliberately leave the host adb server attached
      // so the device stays in "Wireless devices" for a one-click re-attach.
      disconnectDevice: async () => {
        await actions.stopMirror();          // also stops any recording
        await webadb.disconnect();
        revokePreview();
        set({
          connected: false, device: null, deviceInfo: null, logs: [], files: [],
          apps: [], procs: [], nodes: [], perf: [], net: [], frida: null,
          settings: [], settingsSel: null, settingsVal: '',
          fileSel: null, preview: null, clipboard: null, appSel: null, appInfo: null,
          mirrorOn: false, mirrorSize: null,
          fridaTarget: '', fridaTargetOpen: false, rootAvailable: false, rootMode: false
        });
        toast('Device disconnected');
      },

      /** Reboots the device: '' (system), 'recovery', or 'bootloader'. */
      reboot: async (mode = '') => {
        if (!webadb.isConnected()) { toast('No device connected'); return; }
        toast(`Rebooting → ${mode || 'system'}…`);
        try { await webadb.run(`reboot ${mode}`.trim()); } catch { /* link drops as it reboots */ }
        await actions.disconnectDevice();   // the device is going down; reset the UI
      },

      // ---- mirroring ----
      startMirror: async (canvas) => {
        if (!webadb.isConnected()) { toast('No device connected'); return; }
        set({ mirrorBusy: true, mirrorErr: '' });
        try {
          const size = await mirror.startMirror(webadb.adb(), canvas, {
            onSize: (sz) => set({ mirrorSize: sz }),
            onStep: (m) => shellOut(['· ' + m], 'dim')
          });
          set({ mirrorOn: true, mirrorBusy: false, mirrorSize: size });
          toast('Mirroring started');
        } catch (e) {
          set({ mirrorBusy: false, mirrorOn: false, mirrorErr: e.message });
          shellOut(['· mirror FAILED: ' + e.message], 'dim');
          toast('Mirror failed: see the shell.');
        }
      },

      toggleRecording: async (canvas) => {
        if (record.isRecording()) {
          await finishRecording();
          set({ recording: false, recordSecs: 0 });
          return;
        }
        if (!s.mirrorOn) { toast('Start mirroring first'); return; }
        try {
          record.startRecording(canvas);
          set({ recording: true, recordSecs: 0 });
          toast('Recording…');
        } catch (e) { toast(e.message); }
      },

      stopMirror: async () => {
        await finishRecording();   // save an in-progress recording before teardown
        await mirror.stopMirror().catch(() => {});
        set({ mirrorOn: false, mirrorSize: null, recording: false, recordSecs: 0 });
      },

      // Pointer stream for the mirror: down/move/up give real taps, drags and swipes.
      pointerDown: async (nx, ny) => {
        try { await mirror.pointerDown(nx, ny); }
        catch (e) { toast(e.message); }
      },
      pointerMove: async (nx, ny) => {
        try { await mirror.pointerMove(nx, ny); } catch { /* ignore mid-drag */ }
      },
      pointerUp: async (nx, ny) => {
        try { await mirror.pointerUp(nx, ny); } catch { /* ignore */ }
      },

      pressKey: async (keyCode, label) => {
        try { await mirror.pressKey(keyCode); toast(label); }
        catch (e) { toast(`${label}: ${e.message}`); }
      },

      wakeScreen: async () => {
        try { await mirror.setScreenPower(true); toast('Wake screen'); }
        catch { toast('Start mirroring first'); }
      },

      rotateDevice: async () => {
        try { await mirror.rotateDevice(); toast('Rotate'); }
        catch { toast('Start mirroring first'); }
      },

      expandNotifications: async () => {
        try { await mirror.expandNotifications(); toast('Notification shade'); }
        catch { toast('Start mirroring first'); }
      },

      sendText: async () => {
        const text = s.typeText;
        if (!text) return;
        try { await mirror.injectText(text); set({ typeText: '' }); toast('Sent text'); }
        catch {
          if (webadb.isConnected()) {
            // Single-quote the argument so $(...), backticks and $vars stay literal
            // input rather than executing in the device shell.
            const arg = `'${text.replace(/'/g, `'\\''`)}'`;
            webadb.run(`input text ${arg}`).then(
              () => { set({ typeText: '' }); toast('Sent text'); },
              (e) => toast('input text failed: ' + e.message)
            );
          } else toast('No device connected');
        }
      },

      /** Screenshot always lands on the PC, never on the device. */
      screenshot: async () => {
        if (!webadb.isConnected()) { toast('No device connected'); return; }
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const name = `loupe-screenshot-${stamp}.png`;
        try {
          // Mirroring? Use the already-decoded frame — instant, no round trip.
          const frame = await mirror.snapshot();
          if (frame) {
            download(frame, name);
            toast('Screenshot saved');
            return;
          }
          // Otherwise capture on device, pull it back, then clean up after
          // ourselves so nothing is left behind on the phone.
          const remote = `/data/local/tmp/loupe-shot-${Date.now()}.png`;
          await webadb.sh(`screencap -p ${remote}`);
          try {
            const { bytes } = await webadb.readAny(remote, 64 * 1024 * 1024);
            if (!bytes.length) throw new Error('screencap produced no image');
            download(new Blob([bytes], { type: 'image/png' }), name);
            toast('Screenshot saved');
          } finally {
            await webadb.sh(`rm -f ${remote}`).catch(() => {});
          }
        } catch (e) {
          toast('screenshot: ' + e.message);
        }
      },

      runShell: (raw) => {
        const cmd = raw.trim();
        if (!cmd) return;
        if (cmd === 'clear') { set({ shell: [], shellIn: '', histIx: -1 }); return; }
        update((st) => ({
          shell: st.shell.concat([{ t: `${st.rootMode ? '#' : '$'} ${cmd}`, k: 'cmd' }]).slice(-LIMITS.shell),
          shellIn: '', hist: st.hist.concat(cmd), histIx: -1
        }));
        if (!webadb.isConnected()) { shellOut(['No device connected: connect one first.'], 'dim'); return; }
        // Root mode wraps commands in `su -c`, so kill / dumpsys / cat on
        // protected paths behave the way they would in a root shell.
        webadb.sh(cmd).then(
          (out) => shellOut(out ? out.split('\n') : []),
          (err) => shellOut([String(err.message || err)], 'dim')
        );
      }
    };
  }, [set, update, s.typeText, s.path, s.clipboard, s.appFilter, s.pairAddr, s.pairCode, s.connectAddr, s.qr, s.memText, s.memLabel, s.rootMode, s.mirrorOn, s.memRegionQ, s.memCapMB, s.deviceInfo, s.frida, s.fridaSpawn, s.script, s.fridaUrl, s.fridaTarget, s.rootAvailable, s.devProxyHost, s.devProxyPort, s.certHash]);

  const value = useMemo(() => ({ s, ...actions }), [s, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
