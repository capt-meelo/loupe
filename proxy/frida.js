/**
 * frida-server delivery.
 *
 * The page can't do this itself: GitHub's release assets don't send CORS
 * headers, and the binaries ship as `.xz`, which the browser has no decoder
 * for. So Node fetches and decompresses, then hands the page a plain binary it
 * can push to the device over ADB like any other file.
 */
import { spawn } from 'node:child_process';

const API = 'https://api.github.com/repos/frida/frida/releases';
const UA = { 'User-Agent': 'loupe', Accept: 'application/vnd.github+json' };

/** Android ABI (as `getprop ro.product.cpu.abi` reports it) → frida's name. */
export function fridaArch(abi = '') {
  const a = abi.toLowerCase();
  if (a.includes('arm64')) return 'arm64';
  if (a.includes('armeabi') || a.startsWith('arm')) return 'arm';
  if (a.includes('x86_64')) return 'x86_64';
  if (a.includes('x86')) return 'x86';
  return 'arm64';
}

const assetName = (version, arch) => `frida-server-${version}-android-${arch}.xz`;

/** Decompresses xz on stdin. Runs the host `xz`; no npm dependency for it. */
function unxz(buffer) {
  return new Promise((resolve, reject) => {
    const child = spawn('xz', ['-d', '-c'], { stdio: ['pipe', 'pipe', 'pipe'] });
    const out = [];
    let err = '';
    child.stdout.on('data', (c) => out.push(c));
    child.stderr.on('data', (c) => { err += c; });
    child.on('error', () => reject(new Error('`xz` is not installed on this machine: `brew install xz`')));
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(out));
      else reject(new Error(err.trim() || `xz exited ${code}`));
    });
    child.stdin.end(buffer);
  });
}

/** The newest releases that actually ship an android-<arch> server. */
export async function listVersions(arch, limit = 12) {
  const res = await fetch(`${API}?per_page=30`, { headers: UA });
  if (!res.ok) throw new Error(`GitHub said ${res.status}`);
  const releases = await res.json();
  return releases
    .filter((r) => !r.draft && (r.assets || []).some((a) => a.name === assetName(r.tag_name, arch)))
    .slice(0, limit)
    .map((r) => ({ version: r.tag_name, published: r.published_at }));
}

/** Newest release that ships a server for this arch. */
export async function latestVersion(arch) {
  const [newest] = await listVersions(arch, 1);
  if (!newest) throw new Error(`no frida release ships an android-${arch} server`);
  return newest.version;
}

/** Fetches one server binary, decompressed. `version` may be 'latest'. */
export async function fetchServer(version, arch) {
  if (!version || version === 'latest') version = await latestVersion(arch);
  const name = assetName(version, arch);
  const url = `https://github.com/frida/frida/releases/download/${encodeURIComponent(version)}/${name}`;
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!res.ok) throw new Error(`${name}: GitHub said ${res.status}`);
  const packed = Buffer.from(await res.arrayBuffer());
  const bin = await unxz(packed);
  if (!bin.length) throw new Error('decompressed to nothing');
  return { name: name.replace(/\.xz$/, ''), bytes: bin, packedSize: packed.length, version };
}

const MAX_SCRIPT = 2_000_000; // 2 MB is already absurd for a Frida agent

async function fetchText(target) {
  // Never let a slow or dead host hang the run; fail with a clear message.
  const res = await fetch(target, {
    headers: { 'User-Agent': 'loupe' }, redirect: 'follow', signal: AbortSignal.timeout(15000)
  }).catch((e) => { throw new Error(e.name === 'TimeoutError' ? `timed out fetching ${new URL(target).hostname}` : e.message); });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${new URL(target).hostname}`);
  const text = await res.text();
  if (text.length > MAX_SCRIPT) throw new Error('script is larger than 2 MB; paste it directly instead');
  return text;
}
const fetchJson = async (target) => JSON.parse(await fetchText(target));

/**
 * Turn a shared-script link into raw JavaScript. Supports Frida CodeShare,
 * a GitHub file (blob or raw), and a single-file Gist. Throws a clear message
 * when the link points at a repo, a folder, or several files instead of one
 * script, so the panel can show it.
 */
export async function resolveScript(raw) {
  let u;
  try { u = new URL(raw.trim()); } catch { throw new Error('that does not look like a URL'); }
  const host = u.hostname.toLowerCase();

  // Frida CodeShare: https://codeshare.frida.re/@user/project/
  if (host === 'codeshare.frida.re') {
    const m = u.pathname.match(/^\/@?([^/]+)\/([^/]+)/);
    if (!m) throw new Error('expected a CodeShare project link like codeshare.frida.re/@user/project');
    const json = await fetchJson(`https://codeshare.frida.re/api/project/${m[1]}/${m[2]}/`);
    if (typeof json.source !== 'string' || !json.source.trim()) throw new Error('CodeShare returned no script for that project');
    return json.source;
  }

  // Already-raw hosts: fetch as-is.
  if (host === 'raw.githubusercontent.com' || host === 'gist.githubusercontent.com') return fetchText(u.href);

  // GitHub file page: https://github.com/owner/repo/blob/branch/path/file.js
  if (host === 'github.com') {
    const m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
    if (!m) throw new Error('link one file (github.com/owner/repo/blob/branch/file.js), not a repo or folder');
    if (!/\.(js|ts)$/i.test(m[3])) throw new Error('that GitHub link is not a .js file');
    return fetchText(`https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`);
  }

  // Gist: https://gist.github.com/user/<id>
  if (host === 'gist.github.com') {
    const m = u.pathname.match(/([0-9a-f]{20,})/i);
    if (!m) throw new Error('that is not a Gist link');
    const files = Object.values((await fetchJson(`https://api.github.com/gists/${m[1]}`)).files || {});
    const scripts = files.filter((f) => /\.(js|ts)$/i.test(f.filename) || f.language === 'JavaScript');
    const pick = scripts.length ? scripts : files;
    if (pick.length === 0) throw new Error('that Gist has no files');
    if (pick.length > 1) {
      throw new Error(`that Gist has ${pick.length} scripts (${pick.map((f) => f.filename).join(', ')}); link one file's raw URL`);
    }
    return pick[0].truncated ? fetchText(pick[0].raw_url) : pick[0].content;
  }

  throw new Error('unsupported link; use a CodeShare, GitHub file, or Gist URL (or paste the script itself)');
}

/** Handles /__loupe/frida/*. Returns true if it took the request. */
export async function handleFridaApi(req, res, path, { cors }) {
  if (!path.startsWith('/__loupe/frida/')) return false;
  const url = new URL(req.url, 'http://x');
  const arch = fridaArch(url.searchParams.get('abi') || '');
  cors(req, res);

  try {
    if (path === '/__loupe/frida/versions') {
      const versions = await listVersions(arch);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, arch, latest: versions[0]?.version || null, versions }));
      return true;
    }

    if (path === '/__loupe/frida/server') {
      // No version, or 'latest', resolves to the newest release every time —
      // nothing here is cached, so a stale pin can't creep in.
      const { name, bytes, packedSize, version } = await fetchServer(
        url.searchParams.get('version'), arch
      );
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': bytes.length,
        'X-Loupe-Name': name,
        'X-Loupe-Version': version,
        'X-Loupe-Packed': String(packedSize),
        'Cache-Control': 'no-store',
        'Access-Control-Expose-Headers': 'X-Loupe-Name, X-Loupe-Version, X-Loupe-Packed'
      });
      res.end(bytes);
      return true;
    }

    if (path === '/__loupe/frida/script') {
      const source = await resolveScript(url.searchParams.get('url') || '');
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, source }));
      return true;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end('{"ok":false,"error":"unknown frida endpoint"}');
    return true;
  } catch (e) {
    // undici reports network problems as a bare "fetch failed"; the cause is
    // where the actual reason lives, so surface it.
    const cause = e?.cause?.message || e?.cause?.code || '';
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: String(e?.message || e) + (cause ? ` (${cause})` : '') }));
    return true;
  }
}

// ------------------------------------------------------- running a script --

import { readFileSync } from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import frida from 'frida';

// Frida 17 removed the bundled Java/ObjC bridges from the agent runtime, so a
// classic `Java.perform(...)` script now throws `ReferenceError: 'Java' is not
// defined`. This prelude (frida-java-bridge, compiled by frida-compile into one
// file) re-defines the global. See scripts/build-frida-bridge.mjs to rebuild.
const bridgePrelude = readFileSync(
  fileURLToPath(new URL('./agent/bridge-prelude.js', import.meta.url)), 'utf8'
);
// Frida 17 also dropped the static Module.findExportByName / getExportByName /
// findBaseAddress / getBaseAddress helpers that pre-17 scripts lean on. Restore
// them in terms of the APIs that remain. Kept to one physical line so it costs a
// single line of offset when the heavy Java bridge isn't also needed.
const MODULE_COMPAT =
  "if(typeof Module!=='undefined'&&!Module.findExportByName){" +
  "Module.findExportByName=(m,n)=>m==null?Module.findGlobalExportByName(n):(Process.findModuleByName(m)?.findExportByName(n)??null);" +
  "Module.getExportByName=(m,n)=>m==null?Module.getGlobalExportByName(n):Process.getModuleByName(m).getExportByName(n);" +
  "Module.findBaseAddress=(n)=>Process.findModuleByName(n)?.base??null;" +
  "Module.getBaseAddress=(n)=>Process.getModuleByName(n).base;}";

// Frida also long ago removed the standalone Memory.readX / Memory.writeX
// helpers; the reads/writes now live on NativePointer. Regenerate the old names
// as thin forwarders. One physical line, same as above.
const MEMORY_COMPAT =
  "if(typeof Memory!=='undefined'&&!Memory.readPointer){" +
  "['Pointer','S8','U8','S16','U16','S32','U32','S64','U64','Short','UShort','Int','UInt','Long','ULong','Float','Double','ByteArray','CString','Utf8String','Utf16String','AnsiString']" +
  ".forEach(t=>Memory['read'+t]=(p,...a)=>ptr(p)['read'+t](...a));" +
  "['Pointer','S8','U8','S16','U16','S32','U32','S64','U64','Short','UShort','Int','UInt','Long','ULong','Float','Double','ByteArray','Utf8String','Utf16String','AnsiString']" +
  ".forEach(t=>Memory['write'+t]=(p,...a)=>ptr(p)['write'+t](...a));}";

/**
 * Prepend the shims a pre-17 script needs: the Java bridge when it uses the
 * `Java` global, and the Module.* compat when it uses a removed static. Returns
 * the line count added so error line numbers can be shifted back.
 */
function withBridge(source) {
  const parts = [];
  if (/\bModule\.(findExportByName|getExportByName|findBaseAddress|getBaseAddress)\b/.test(source)) {
    parts.push(MODULE_COMPAT);
  }
  if (/\bMemory\.(read|write)[A-Z]/.test(source)) parts.push(MEMORY_COMPAT);
  const usesJava = /\bJava\s*\./.test(source);
  // Only a script that *assigns* its own bridge should suppress ours — a mere
  // read like `globalThis.Java?.available` (httptoolkit's config.js does this)
  // must not, or it loses the bridge and throws `Java is not defined`.
  const definesJava = /\b(import|require)\b[^\n]*\bfrida-java-bridge\b/.test(source)
    || /\bglobalThis\.Java\s*=(?!=)/.test(source);
  if (usesJava && !definesJava) parts.push(bridgePrelude);

  if (parts.length === 0) return { source, offset: 0 };
  const prelude = parts.join('\n');
  return { source: prelude + '\n' + source, offset: prelude.split('\n').length };
}

/** Undo the prelude's line shift in an error line/`:<n>` reference. */
const unshift = (n, offset) => (n > offset ? n - offset : n);

/**
 * Runs a Frida script against the device and streams its output.
 *
 * The browser can't speak Frida's protocol, and frida-server listens only on
 * the device's own loopback. frida-node (in this process) needs a TCP endpoint
 * to it, so the bridge listens on a local port and tunnels that connection to
 * the device's tcp:27042 through THIS WebSocket: the browser opens an ADB socket
 * to frida-server and relays the bytes. That works the same over USB and Wi-Fi,
 * because the browser owns the only device connection in both — and unlike
 * `adb forward`, it never needs the host adb server (which can't claim the USB
 * interface the browser's WebUSB session already holds).
 *
 * The socket multiplexes: text frames are JSON control (the run request in, logs
 * and status out); binary frames are the raw frida tunnel. One socket is one
 * run: closing it unloads the script and tears the tunnel down.
 */
export function attachFridaSockets(server, { accessOk }) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname !== '/__loupe/frida/session') return;   // not ours
    if (!accessOk(req)) { socket.destroy(); return; }

    wss.handleUpgrade(req, socket, head, (ws) => runSession(ws, url));
  });
}

async function runSession(ws, url) {
  const serial = url.searchParams.get('serial');
  const send = (o) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(o)); };
  const log = (line, kind = 'log') => send({ type: 'log', kind, line });

  let device = null;
  let session = null;
  let script = null;
  let tunnel = null;      // local TCP server frida-node connects to
  let fridaConn = null;   // the accepted frida-node connection

  const cleanup = async () => {
    try { await script?.unload(); } catch { /* gone */ }
    try { await session?.detach(); } catch { /* gone */ }
    try { fridaConn?.destroy(); } catch { /* gone */ }
    try { tunnel?.close(); } catch { /* gone */ }
    script = session = device = fridaConn = tunnel = null;
  };

  ws.on('close', cleanup);
  ws.on('error', cleanup);

  // Binary frames are the browser's frida-server bytes; feed them to frida-node.
  // (The first, text, frame is the run request, handled by the `once` below.)
  ws.on('message', (data, isBinary) => { if (isBinary && fridaConn) fridaConn.write(data); });

  // First message carries the script and target: { source, target, spawn }.
  ws.once('message', async (raw) => {
    let req;
    try { req = JSON.parse(raw); } catch { send({ type: 'error', error: 'bad request' }); ws.close(); return; }
    const { source, target, spawn, pid: reqPid } = req;
    if (!source) { send({ type: 'error', error: 'no script' }); ws.close(); return; }

    try {
      // A local TCP server whose one connection (frida-node) is tunnelled to the
      // device's frida-server through the browser over this WebSocket.
      log('opening a tunnel to frida-server through the device connection…');
      tunnel = net.createServer((sock) => {
        fridaConn = sock;
        sock.on('data', (buf) => { if (ws.readyState === ws.OPEN) ws.send(buf); });
        sock.on('error', () => {});
        sock.on('close', () => { if (fridaConn === sock) fridaConn = null; });
      });
      const localPort = await new Promise((res, rej) => {
        tunnel.once('error', rej);
        tunnel.listen(0, '127.0.0.1', () => res(tunnel.address().port));
      });

      log('connecting to frida-server…');
      device = await frida.getDeviceManager().addRemoteDevice(`127.0.0.1:${localPort}`);

      let pid;
      if (spawn && target) {
        log(`spawning ${target}…`);
        pid = await device.spawn(target);
        session = await device.attach(pid);
      } else if (Number.isFinite(reqPid) && reqPid > 0) {
        log(`attaching to pid ${reqPid}…`);
        session = await device.attach(reqPid);
      } else if (target) {
        // attach by pid (number) or by name
        const asPid = Number(target);
        if (Number.isFinite(asPid) && String(asPid) === String(target)) {
          log(`attaching to pid ${asPid}…`);
          session = await device.attach(asPid);
        } else {
          const procs = await device.enumerateProcesses();
          const hit = procs.find((p) => p.name === target)
            || procs.find((p) => p.name.includes(target));
          if (!hit) throw new Error(`no running process matches "${target}"; tick Spawn to launch it`);
          log(`attaching to ${hit.name} (${hit.pid})…`);
          session = await device.attach(hit.pid);
        }
      } else {
        throw new Error('pick a target app first');
      }

      const built = withBridge(source);
      script = await session.createScript(built.source);
      // console.log/warn/error from the agent arrive here, NOT on the message
      // signal (frida-node's default handler otherwise just prints to stdout).
      script.logHandler = (level, text) => {
        send({ type: 'log', kind: level === 'error' ? 'error' : 'agent', line: text });
      };
      script.message.connect((message, data) => {
        if (message.type === 'send') {
          const p = message.payload;
          send({ type: 'message', payload: typeof p === 'string' ? p : JSON.stringify(p) });
        } else if (message.type === 'error') {
          let line = message.stack || message.description || 'script error';
          if (built.offset) {
            if (Number.isFinite(message.lineNumber)) {
              line = `${message.description} (line ${unshift(message.lineNumber, built.offset)})`;
            } else {
              line = line.replace(/:(\d+)(?=[:)])/g, (m, n) => ':' + unshift(Number(n), built.offset));
            }
          }
          send({ type: 'log', kind: 'error', line });
        }
      });
      script.destroyed.connect(() => { send({ type: 'status', status: 'script-destroyed' }); });

      await script.load();
      if (spawn && pid != null) { await device.resume(pid); log(`resumed ${target} (${pid})`); }

      send({ type: 'status', status: 'running' });
      log('script loaded: output streams below. Stop to unload.');
    } catch (e) {
      send({ type: 'log', kind: 'error', line: 'FAILED: ' + String(e?.message || e) });
      send({ type: 'status', status: 'stopped' });
      await cleanup();
      ws.close();
    }
  });
}
