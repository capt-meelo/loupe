/**
 * Real ADB over WebUSB, via ya-webadb. Chromium only (Chrome/Edge), and the page
 * must be a secure context (localhost or https).
 *
 * These are ordinary npm imports resolved by the bundler, so every @yume-chan
 * package is a single deduped copy pinned by the lockfile. That matters: the ADB
 * packet framing shares `stream-extra` and `struct` types across packages, and
 * mismatched copies make the handshake fail silently.
 *
 * The live session is a module singleton — the Adb object isn't serialisable, so
 * React state holds only plain flags and components call these helpers.
 */
import { Adb, AdbDaemonTransport } from '@yume-chan/adb';
import { AdbDaemonWebUsbDeviceManager } from '@yume-chan/adb-daemon-webusb';
import AdbWebCredentialStore from '@yume-chan/adb-credential-web';
import { TextDecoderStream } from '@yume-chan/stream-extra';
import * as wireless from './wireless.js';

let current = null; // { adb, serial, model, kind: 'usb' | 'wifi' }

export const usbSupported = () => typeof navigator !== 'undefined' && !!navigator.usb;
export const isConnected = () => !!current;
export const currentDevice = () =>
  current && { serial: current.serial, model: current.model, kind: current.kind || 'usb' };
/** The live Adb instance — needed by scrcpy, which drives its own sockets. */
export const adb = () => current?.adb ?? null;

/** Rejects if `promise` doesn't settle in `ms`. `msg` may be a function so the
 *  text can describe state observed up to the moment it fires. */
function withTimeout(promise, ms, msg) {
  let timer;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(typeof msg === 'function' ? msg() : msg)), ms);
  });
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
}

/** ADB commands are four ASCII bytes packed little-endian (CNXN, AUTH, OKAY…). */
function commandName(command) {
  if (typeof command !== 'number') return String(command);
  let s = '';
  for (let i = 0; i < 4; i++) s += String.fromCharCode((command >>> (i * 8)) & 0xff);
  return /^[A-Z]{4}$/.test(s) ? s : '0x' + (command >>> 0).toString(16);
}

/**
 * Shows the browser's USB picker, authenticates, and opens an ADB session.
 * `onStep(msg)` reports each phase, so a stall is visible rather than silent.
 */
export async function pickAndConnect(onStep = () => {}) {
  if (!usbSupported()) throw new Error('WebUSB needs Chrome or Edge.');

  const manager = AdbDaemonWebUsbDeviceManager.BROWSER;
  if (!manager) throw new Error('WebUSB unavailable in this browser.');

  onStep('opening USB picker…');
  const device = await manager.requestDevice(); // needs a user gesture
  if (!device) return null; // picker dismissed

  onStep(`claiming interface on ${device.serial}…`);
  const connection = await withTimeout(
    device.connect(),
    15000,
    'Could not claim the USB interface: another program (an adb server?) may hold it. Run `adb kill-server`, unplug/replug, then retry.'
  );

  // Tap the read side so "device sent nothing" is distinguishable from
  // "device replied but auth stalled" — they need different fixes.
  const rx = [];
  const tapped = {
    writable: connection.writable,
    readable: connection.readable.pipeThrough(
      new TransformStream({
        transform(packet, controller) {
          rx.push(commandName(packet?.command));
          controller.enqueue(packet);
        }
      })
    )
  };

  onStep('authenticating: accept "Allow USB debugging" on the phone…');
  const transport = await withTimeout(
    AdbDaemonTransport.authenticate({
      serial: device.serial,
      connection: tapped,
      credentialStore: new AdbWebCredentialStore('Loupe')
    }),
    45000,
    () =>
      rx.length === 0
        ? 'Device sent nothing back (rx=0). The interface was claimed but the phone never replied: usually another adb owns it. Run `adb kill-server`, unplug/replug, retry.'
        : `Phone replied (rx: ${rx.join(',')}) but auth did not finish. Tap "Allow USB debugging" on the phone; if no prompt appeared, revoke USB debugging authorizations and retry.`
  );

  const adb = new Adb(transport);

  onStep('reading device info…');
  const model =
    (await withTimeout(adb.getProp('ro.product.model'), 8000, 'getprop timed out').catch(() => '')) ||
    device.name ||
    'Android device';

  current = { adb, serial: device.serial, model, kind: 'usb' };
  onStep(`connected · ${model}`);

  // Drop our reference if the cable is pulled.
  transport.disconnected.then(() => {
    if (current?.adb === adb) current = null;
  }, () => {});

  return currentDevice();
}

export async function disconnect() {
  if (!current) return;
  const { adb } = current;
  current = null;
  await adb.close().catch(() => {});
}

/**
 * The one-shot command spawner. `subprocess.noneProtocol` extends
 * AdbNoneProtocolSpawner, so it IS the spawner — its `.adb` property is a
 * back-reference to the Adb instance, not another spawner.
 */
const shellSpawner = (adb) => adb.subprocess.noneProtocol;

/**
 * Opens a raw stream to a TCP port on the device (default frida-server's 27042),
 * tunnelled over whatever transport is live. This is how Frida reaches
 * frida-server without the host `adb` tool, so it works over USB and Wi-Fi alike
 * (the host adb can't claim the USB interface the browser already holds).
 */
export async function openTcpSocket(port) {
  if (!current) throw new Error('No device connected.');
  return current.adb.createSocket(`tcp:${port}`);
}

/** Runs one shell command, returning its combined output. */
export async function run(cmd) {
  if (!current) throw new Error('No device connected.');
  const text = await shellSpawner(current.adb).spawnWaitText(cmd);
  return String(text).replace(/\s+$/, '');
}

/**
 * Streams stdout of a long-running command (e.g. logcat) line by line.
 * Returns a stop function that kills the process.
 */
export async function streamLines(cmd, onLine) {
  if (!current) throw new Error('No device connected.');
  const proc = await shellSpawner(current.adb).spawn(cmd);
  const reader = proc.output.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let stopped = false;

  (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done || stopped) break;
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) if (line) onLine(line);
      }
    } catch {
      /* reader torn down on stop */
    }
  })();

  return () => {
    stopped = true;
    reader.cancel().catch(() => {});
    proc.kill().catch(() => {});
  };
}

function humanSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${i ? n.toFixed(1) : n} ${units[i]}`;
}

/** [name, 'd'|'f', size] entries via the ADB sync service (shell user only). */
async function listDirSync(path) {
  if (!current) throw new Error('No device connected.');
  const sync = await current.adb.sync();
  try {
    // readdir() is async and resolves to an array — not an async iterable.
    const entries = await sync.readdir(path);
    const out = entries
      .filter((e) => e.name !== '.' && e.name !== '..')
      .map((e) => {
        const isDir = (Number(e.mode) & 0xf000) === 0x4000; // S_IFDIR
        return [e.name, isDir ? 'd' : 'f', humanSize(Number(e.size))];
      });
    out.sort((a, b) => (a[1] === b[1] ? a[0].localeCompare(b[0]) : a[1] === 'd' ? -1 : 1));
    return out;
  } finally {
    try { await sync.dispose(); } catch { /* socket may already be closed */ }
  }
}

function parseProps(text) {
  const props = {};
  for (const line of text.split('\n')) {
    const m = /^\[([^\]]+)\]:\s*\[([^\]]*)\]/.exec(line.trim());
    if (m) props[m[1]] = m[2];
  }
  return props;
}

/** getprop → the { title, rows } groups the mirror rail renders. */
export async function deviceInfo() {
  const props = parseProps(await run('getprop'));
  const p = (k) => props[k] || '';
  const group = (title, rows) => ({ title, rows: rows.filter((r) => r.v) });
  const verified = p('ro.boot.verifiedbootstate');

  return [
    group('Device', [
      { k: 'model', v: p('ro.product.model') },
      { k: 'brand', v: p('ro.product.brand') },
      { k: 'codename', v: p('ro.product.device') },
      { k: 'serial', v: current?.serial || '' }
    ]),
    group('OS', [
      { k: 'release', v: p('ro.build.version.release') && `Android ${p('ro.build.version.release')}` },
      { k: 'sdk', v: p('ro.build.version.sdk') },
      { k: 'build', v: p('ro.build.id') },
      { k: 'patch', v: p('ro.build.version.security_patch') }
    ]),
    group('Hardware', [
      { k: 'soc', v: p('ro.soc.model') || p('ro.board.platform') },
      { k: 'abi', v: p('ro.product.cpu.abi') },
      { k: 'fingerprint', v: p('ro.build.fingerprint') }
    ]),
    group('Security', [
      { k: 'bootloader', v: verified, color: /green/i.test(verified) ? 'var(--ok)' : 'var(--warn)' },
      { k: 'selinux', v: p('ro.boot.selinux') || 'enforcing' },
      {
        k: 'debuggable',
        v: p('ro.debuggable') === '1' ? 'yes' : 'no',
        color: p('ro.debuggable') === '1' ? 'var(--warn)' : 'var(--ink)'
      }
    ]),
    group('Transport', [
      { k: 'channel', v: current?.kind === 'wifi' ? 'Wi-Fi (adb bridge)' : 'WebUSB' },
      { k: 'adb', v: 'authorized' }
    ])
  ];
}

// ---------------------------------------------------------------- file ops --

/** Shell-quotes a path so spaces and odd characters survive `sh -c`. */
const q = (p) => `'${String(p).replace(/'/g, `'\\''`)}'`;

/** Reads a file off the device, capped so a huge file can't blow up the tab. */
export async function readFile(path, maxBytes = 4 * 1024 * 1024) {
  if (!current) throw new Error('No device connected.');
  const sync = await current.adb.sync();
  try {
    const reader = sync.read(path).getReader();
    const chunks = [];
    let total = 0;
    let truncated = false;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
      if (total >= maxBytes) { truncated = true; await reader.cancel().catch(() => {}); break; }
    }
    const bytes = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { bytes.set(c, off); off += c.length; }
    return { bytes, truncated };
  } finally {
    try { await sync.dispose(); } catch { /* already closed */ }
  }
}

/** Uploads a browser File to `destPath` on the device. */
export async function pushFile(destPath, file, onProgress) {
  if (!current) throw new Error('No device connected.');
  const sync = await current.adb.sync();
  try {
    let sent = 0;
    const source = file.stream().pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          sent += chunk.length;
          onProgress?.(sent, file.size);
          controller.enqueue(chunk);
        }
      })
    );
    await sync.write({ filename: destPath, file: source, permission: 0o644 });
  } finally {
    try { await sync.dispose(); } catch { /* already closed */ }
  }
}

export async function removePath(path, recursive = true) {
  if (!current) throw new Error('No device connected.');
  if (rootMode) return shChecked(`rm -${recursive ? 'r' : ''}f ${q(path)}`);
  return current.adb.rm(path, { recursive, force: true });
}

export const copyPath = (src, dst) => shChecked(`cp -r ${q(src)} ${q(dst)}`);
export const movePath = (src, dst) => shChecked(`mv ${q(src)} ${q(dst)}`);
export const makeDir = (path) => shChecked(`mkdir -p ${q(path)}`);

// ----------------------------------------------------------------- app ops --

/** Installs an APK: push to a temp path, `pm install -r`, then clean up. */
export async function installApk(file, onStep = () => {}) {
  if (!current) throw new Error('No device connected.');
  const tmp = `/data/local/tmp/loupe-${Date.now()}.apk`;
  onStep(`pushing ${file.name} (${(file.size / 1048576).toFixed(1)} MB)…`);
  await pushFile(tmp, file);
  onStep('pm install -r …');
  try {
    const out = await run(`pm install -r ${q(tmp)}`);
    if (!/success/i.test(out)) throw new Error(out.trim() || 'pm install failed');
    return out.trim();
  } finally {
    await run(`rm -f ${q(tmp)}`).catch(() => {});
  }
}

/** Parsed `dumpsys package` details for one package. */
export async function packageInfo(pkg) {
  const [dump, path] = await Promise.all([
    run(`dumpsys package ${q(pkg)}`),
    run(`pm path ${q(pkg)}`).catch(() => '')
  ]);
  const grab = (re) => { const m = re.exec(dump); return m ? m[1].trim() : ''; };
  const permissions = [...dump.matchAll(/^\s*(android\.permission\.[A-Z_0-9.]+)/gm)]
    .map((m) => m[1]);
  // COMPONENT_ENABLED_STATE: 0 default, 1 enabled → on; 2/3/4 disabled variants → off.
  const enabledVal = Number(grab(/\benabled=(\d+)/) || 0);
  return {
    enabled: enabledVal === 0 || enabledVal === 1,
    versionName: grab(/versionName=(\S+)/),
    versionCode: grab(/versionCode=(\S+)/),
    targetSdk: grab(/targetSdk=(\S+)/),
    minSdk: grab(/minSdk=(\S+)/),
    firstInstall: grab(/firstInstallTime=(.+)/),
    lastUpdate: grab(/lastUpdateTime=(.+)/),
    dataDir: grab(/dataDir=(\S+)/),
    userId: grab(/userId=(\S+)/),
    apk: path.replace(/^package:/gm, '').trim(),
    permissions: [...new Set(permissions)].sort()
  };
}

// ---------------------------------------------------------------- root mode --

/**
 * Root support.
 *
 * The ADB *sync* service runs as the shell user and ignores `su`, so a rooted
 * phone still can't list or read `/data/data/...` through it. Everything below
 * therefore routes through a root shell instead, staging bytes via
 * /data/local/tmp (which sync *can* reach) when real file transfer is needed.
 */
let rootMode = false;

export const setRootMode = (on) => { rootMode = !!on; };

/** Quotes a whole command so it survives `su -c '<cmd>'`. */
const qc = (cmd) => `'${String(cmd).replace(/'/g, `'\\''`)}'`;

/** True if `su` yields an actual uid=0 shell. */
export async function detectRoot() {
  if (!current) return false;
  try { return /uid=0/.test(await run('su -c id')); }
  catch { return false; }
}

/** Runs a command, elevated when root mode is on. */
export const sh = (cmd) => run(rootMode ? `su -c ${qc(cmd)}` : cmd);

/**
 * Like sh(), but throws if the command exits nonzero. The none-protocol shell
 * reports no exit status, so append a sentinel and read `$?` from inside the
 * (su'd) shell. Use for destructive ops (cp/mv/mkdir/rm) where a silent failure
 * would otherwise be reported to the user as success.
 */
export async function shChecked(cmd) {
  const wrapped = `${cmd}; echo "__loupe_rc=$?"`;
  const out = await run(rootMode ? `su -c ${qc(wrapped)}` : wrapped);
  const m = /__loupe_rc=(\d+)\s*$/.exec(out);
  const body = out.replace(/__loupe_rc=\d+\s*$/, '').replace(/\s+$/, '');
  if (!m || Number(m[1]) !== 0) {
    throw new Error(body.split('\n').filter(Boolean).pop() || 'command failed');
  }
  return body;
}

const STAGE = '/data/local/tmp';

/** Parses `ls -la` into the same [name, type, size] tuples listDir returns. */
function parseLsLong(text) {
  const out = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || /^total\s/i.test(line)) continue;
    const m = /^([bcdlps-])([rwxsStT-]{9})\s+\d+\s+\S+\s+\S+\s+(\d+)\s+\S+\s+\S+\s+(.*)$/.exec(line);
    if (!m) continue;
    let name = m[4];
    if (m[1] === 'l') name = name.split(' -> ')[0]; // symlink target isn't the name
    if (name === '.' || name === '..') continue;
    out.push([name, m[1] === 'd' ? 'd' : 'f', humanSize(Number(m[3]))]);
  }
  return out;
}

/** Directory listing through a root shell (works where sync is refused). */
export async function listDirRoot(path) {
  // -L dereferences symlinks so a link to a directory (e.g. /sdcard) is
  // reported as a directory and stays navigable.
  const text = await sh(`ls -laL ${q(path)}`);
  if (/permission denied|no such file/i.test(text) && !/^total/im.test(text)) {
    throw new Error(text.trim().split('\n')[0] || 'ls failed');
  }
  let rows = parseLsLong(text);
  if (rows.length === 0) {
    // Some builds print a different long format — fall back to names only.
    const names = await sh(`ls -1ApL ${q(path)}`);
    rows = names.split('\n').map((n) => n.trim()).filter(Boolean).map((n) =>
      n.endsWith('/') ? [n.slice(0, -1), 'd', '—'] : [n, 'f', '—']
    );
  }
  rows.sort((a, b) => (a[1] === b[1] ? a[0].localeCompare(b[0]) : a[1] === 'd' ? -1 : 1));
  return rows;
}

/**
 * Reads a root-only file by copying it somewhere sync can reach, then pulling
 * it normally — far faster and binary-safe compared with piping base64.
 */
export async function readFileRoot(path, maxBytes) {
  const tmp = `${STAGE}/loupe-read-${Date.now()}`;
  await sh(`cp ${q(path)} ${q(tmp)}`);
  await sh(`chmod 666 ${q(tmp)}`);
  try {
    return await readFile(tmp, maxBytes);
  } finally {
    await sh(`rm -f ${q(tmp)}`).catch(() => {});
  }
}

/** Writes into a root-only location by staging then copying with su. */
export async function pushFileRoot(destPath, file, onProgress) {
  const tmp = `${STAGE}/loupe-write-${Date.now()}`;
  await pushFile(tmp, file, onProgress);
  try {
    // Throws if the copy fails (read-only dest, full fs, …) so the UI can't
    // report a partial or missing write as "upload complete".
    await shChecked(`cp ${q(tmp)} ${q(destPath)}`);
  } finally {
    await sh(`rm -f ${q(tmp)}`).catch(() => {});
  }
}

// -------------------------------------------------- root-aware dispatchers --

/**
 * Lists a directory, preferring the fast sync service and falling back to a
 * root shell when sync is refused — sync ignores `su`, so this is the only way
 * `/data/data/...` is readable on a rooted device.
 */
export async function listDir(path) {
  if (rootMode) {
    try { return await listDirRoot(path); }
    catch (e) { return await listDirSync(path).catch(() => { throw e; }); }
  }
  try {
    return await listDirSync(path);
  } catch (e) {
    if (await detectRoot()) {
      rootMode = true;
      return listDirRoot(path);
    }
    throw e;
  }
}

/** Reads a file, staging through a root shell when needed. */
export async function readAny(path, maxBytes) {
  if (rootMode) {
    try { return await readFileRoot(path, maxBytes); }
    catch { return readFile(path, maxBytes); }
  }
  try {
    return await readFile(path, maxBytes);
  } catch (e) {
    if (await detectRoot()) { rootMode = true; return readFileRoot(path, maxBytes); }
    throw e;
  }
}

/** Uploads a file, staging through a root shell when the target needs it. */
export async function pushAny(destPath, file, onProgress) {
  if (rootMode) {
    try { return await pushFileRoot(destPath, file, onProgress); }
    catch { return pushFile(destPath, file, onProgress); }
  }
  try {
    return await pushFile(destPath, file, onProgress);
  } catch (e) {
    if (await detectRoot()) { rootMode = true; return pushFileRoot(destPath, file, onProgress); }
    throw e;
  }
}

// ------------------------------------------------------------- heap dumps --

/** Byte size of a path, or 0 if it doesn't exist / isn't readable. */
async function sizeOf(path) {
  const out = await sh(`stat -c %s ${q(path)} 2>/dev/null`).catch(() => '');
  const n = parseInt(String(out).trim().split(/\s+/)[0], 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Waits for `path` to appear and stop growing. A large heap can take a minute
 * or more, and the file starts at 0 bytes, so this tolerates a slow start and
 * only gives up once nothing has been written for a long while.
 */
async function waitForFile(path, onStep, { totalMs = 180000, startGraceMs = 20000 } = {}) {
  const step = 500;
  const started = Date.now();
  let last = -1;
  let stable = 0;
  let size = 0;

  for (;;) {
    await new Promise((r) => setTimeout(r, step));
    size = await sizeOf(path);
    const elapsed = Date.now() - started;

    if (size > 0) {
      if (size === last) {
        // Three consecutive identical readings means the writer is done.
        if (++stable >= 3) return size;
      } else {
        stable = 0;
        onStep(`writing… ${(size / 1048576).toFixed(1)} MB`);
      }
    } else if (elapsed > startGraceMs) {
      return 0; // never even started
    } else if (elapsed % 4000 < step) {
      onStep(`waiting for the dump to start… ${Math.round(elapsed / 1000)}s`);
    }

    if (elapsed > totalMs) return size;
    last = size;
  }
}

export async function dumpHeap(pid, processName, onStep = () => {}) {
  if (!current) throw new Error('No device connected.');

  const pkg = String(processName || '').split(':')[0];
  const isPkg = /^[a-z][\w.]*\.[\w.]+$/i.test(pkg);

  // `am dumpheap` silently writes nothing for a release build, so check the
  // package's DEBUGGABLE flag first rather than burning a minute discovering it.
  if (isPkg) {
    const flags = await sh(`dumpsys package ${q(pkg)} | grep -m1 flags=`).catch(() => '');
    if (flags && !/DEBUGGABLE/.test(flags)) {
      const err = new Error(`${pkg} is a release build (not DEBUGGABLE): am dumpheap cannot produce an .hprof`);
      err.code = 'NOT_DEBUGGABLE';
      throw err;
    }
  }

  // Candidate write targets the fd-holder (system_server) can actually write.
  // /sdcard is FUSE and always denied for system_server, so it's omitted.
  const dirs = [];
  if (isPkg) dirs.push(`/data/data/${pkg}`);
  dirs.push(STAGE);

  // Candidate process identifiers — some builds want the name, not the pid.
  const targets = [String(pid)];
  if (processName && processName !== String(pid)) targets.push(processName);

  const attempts = [];
  for (const dir of dirs) {
    for (const target of targets) {
      const remote = `${dir}/loupe-${pid}.hprof`;
      await sh(`rm -f ${q(remote)}`).catch(() => {});

      onStep(`am dumpheap ${target} → ${remote}`);
      const out = (await sh(`am dumpheap ${target} ${q(remote)} 2>&1`).catch((e) => String(e.message))).trim();

      // `am dumpheap` prints "File: <path>" when it ACCEPTS the request — that
      // is success, not an error. Only a real complaint means try elsewhere.
      const accepted = out === '' || /^File:/i.test(out);
      if (!accepted) {
        attempts.push(`${dir} [${target}]: ${out.split('\n')[0]}`);
        continue;
      }

      // Accepted: the write is asynchronous and a big heap takes a while.
      const size = await waitForFile(remote, onStep, { startGraceMs: 10000 });
      if (size > 0) {
        onStep(`pulling ${(size / 1048576).toFixed(1)} MB…`);
        const staged = `${STAGE}/loupe-${pid}.hprof`;
        if (dir !== STAGE) await sh(`cp ${q(remote)} ${q(staged)}`);
        await sh(`chmod 666 ${q(staged)}`).catch(() => {});
        try {
          const { bytes } = await readFile(staged, 2 * 1024 * 1024 * 1024);
          if (bytes.length) return bytes;
          attempts.push(`${dir}: ${size}B on device but read back empty`);
        } finally {
          await sh(`rm -f ${q(remote)} ${q(staged)}`).catch(() => {});
        }
      } else {
        await sh(`rm -f ${q(remote)}`).catch(() => {});
        attempts.push(`${dir} [${target}]: accepted but nothing was written`);
        // Accepted yet empty is conclusive: the VM refused. Retrying the same
        // request elsewhere just wastes another minute.
        const err = new Error('the VM accepted the request but wrote nothing: the app is not debuggable');
        err.code = 'NOT_DEBUGGABLE';
        throw err;
      }
    }
  }

  const detail = attempts.length ? `: ${attempts.join(' | ')}` : '';
  throw new Error('heap dump refused' + detail);
}

// ------------------------------------------------- raw process memory dump --

/** Parses `/proc/<pid>/maps` into readable-region descriptors. */
function parseMaps(text) {
  const regions = [];
  for (const line of text.split('\n')) {
    const m = /^([0-9a-f]+)-([0-9a-f]+)\s+(\S{4})\s+\S+\s+\S+\s+\S+\s*(.*)$/.exec(line.trim());
    if (!m) continue;
    const start = parseInt(m[1], 16);
    const end = parseInt(m[2], 16);
    const perms = m[3];
    const name = (m[4] || '[anon]').trim() || '[anon]';
    if (perms[0] !== 'r') continue;                 // unreadable
    if (/\[(vvar|vsyscall|vectors)\]/.test(name)) continue; // dd errors on these
    if (end > start) regions.push({ start, end, size: end - start, perms, name });
  }
  return regions;
}

export async function listMemRegions(pid) {
  if (!current) throw new Error('No device connected.');
  return parseMaps(await sh(`cat /proc/${pid}/maps`));
}

/**
 * Dumps readable memory regions of a process to a single file and returns the
 * bytes. Root only. Each region is copied with `dd` (page-aligned block math)
 * and appended device-side, then pulled once. `filter` matches the region name;
 * `maxBytes` caps the total so a browser blob can't blow up the tab.
 */
export async function dumpProcessMemory(pid, {
  filter = '', maxBytes = 256 * 1024 * 1024, onStep = () => {}
} = {}) {
  if (!current) throw new Error('No device connected.');
  if (!rootMode && !(await detectRoot())) throw new Error('Raw memory dump needs root.');
  rootMode = true;

  let regions = await listMemRegions(pid);
  if (filter) {
    const f = filter.toLowerCase();
    regions = regions.filter((r) => r.name.toLowerCase().includes(f));
  }
  if (regions.length === 0) throw new Error('No readable regions matched.');

  const remote = `${STAGE}/loupe-${pid}.mem`;
  await sh(`rm -f ${q(remote)}`).catch(() => {});

  const PAGE = 4096;
  const written = [];   // regions that actually produced bytes
  let cumulative = 0;
  let scanned = 0;

  for (const r of regions) {
    if (cumulative >= maxBytes) break;
    let want = r.size;
    if (cumulative + want > maxBytes) want = maxBytes - cumulative;   // cap the tail
    const count = Math.ceil(want / PAGE);

    // Append the region, then read back the cumulative size in the same round
    // trip — the delta is exactly what this region contributed, so unreadable
    // regions (dd fails) simply don't appear in the core instead of shifting
    // every later offset.
    const out = await sh(
      `dd if=/proc/${pid}/mem bs=${PAGE} skip=${r.start / PAGE} count=${count} 2>/dev/null >> ${q(remote)}; stat -c %s ${q(remote)} 2>/dev/null`
    ).catch(() => '');
    const size = parseInt(String(out).trim().split(/\s+/).pop(), 10);
    const now = Number.isFinite(size) ? size : cumulative;
    const delta = now - cumulative;

    if (delta > 0) {
      written.push({
        vaddr: r.start,
        memsz: delta,
        filesz: delta,
        dataOffset: cumulative,
        perms: r.perms,
        name: r.name
      });
      cumulative = now;
    }

    scanned++;
    if (scanned % 10 === 0 || cumulative >= maxBytes) {
      onStep(`dumped ${written.length}/${regions.length} regions · ${(cumulative / 1048576).toFixed(1)} MB`);
    }
  }

  if (!cumulative) {
    await sh(`rm -f ${q(remote)}`).catch(() => {});
    throw new Error('nothing could be read from /proc/mem (regions may be protected)');
  }

  await sh(`chmod 666 ${q(remote)}`).catch(() => {});
  onStep(`pulling ${(cumulative / 1048576).toFixed(1)} MB…`);

  try {
    const { bytes } = await readFile(remote, 2 * 1024 * 1024 * 1024);
    if (!bytes.length) throw new Error('dump staged but read back empty');
    const abi = await current.adb.getProp('ro.product.cpu.abi').catch(() => 'arm64-v8a');
    return { bytes, regions: written, abi, truncated: cumulative >= maxBytes, scanned: regions.length };
  } finally {
    await sh(`rm -f ${q(remote)}`).catch(() => {});
  }
}


// ------------------------------------------------------------ frida-server --

const FRIDA_PATH = `${STAGE}/frida-server`;

/** Pushes a server binary to /data/local/tmp and makes it executable. */
export async function installFridaServer(bytes, onStep = () => {}) {
  if (!current) throw new Error('No device connected.');
  onStep(`pushing ${(bytes.length / 1048576).toFixed(1)} MB to ${FRIDA_PATH}…`);
  // A stale server still running would hold the old inode open.
  await stopFridaServer().catch(() => {});
  await sh(`rm -f ${q(FRIDA_PATH)}`).catch(() => {});
  await pushFile(FRIDA_PATH, new Blob([bytes]), (sent, total) => {
    onStep(`pushing… ${Math.round((sent / total) * 100)}%`);
  });
  await sh(`chmod 755 ${q(FRIDA_PATH)}`);
  const size = await sizeOf(FRIDA_PATH);
  if (size !== bytes.length) {
    throw new Error(`push incomplete: ${size} of ${bytes.length} bytes landed`);
  }
  onStep('installed');
  return size;
}

/** pid of a running frida-server, or null. */
export async function fridaPid() {
  const out = await sh('pidof frida-server').catch(() => '');
  const pid = Number(String(out).trim().split(/\s+/)[0]);
  return Number.isFinite(pid) && pid > 0 ? pid : null;
}

/** Version the installed binary reports, or '' if it isn't there. */
export async function fridaInstalledVersion() {
  const out = await sh(`${q(FRIDA_PATH)} --version 2>&1`).catch(() => '');
  const m = /(\d+\.\d+\.\d+)/.exec(String(out));
  return m ? m[1] : '';
}

/**
 * Starts frida-server detached. Root is required: it needs ptrace on other
 * processes. `nohup` plus a redirect keeps it alive after the ADB exec socket
 * for this command closes.
 */
export async function startFridaServer(onStep = () => {}) {
  if (!current) throw new Error('No device connected.');
  if (!(await sizeOf(FRIDA_PATH))) throw new Error('frida-server is not installed on the device yet.');
  if (!rootMode && !(await detectRoot())) throw new Error('frida-server needs root.');
  rootMode = true;

  const running = await fridaPid();
  if (running) return running;

  onStep('starting frida-server…');
  await sh(`nohup ${q(FRIDA_PATH)} -D >${q(STAGE + '/frida.log')} 2>&1 &`).catch(() => {});

  // It forks and listens; give it a moment, then confirm by pid rather than
  // trusting the shell's exit status.
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const pid = await fridaPid();
    if (pid) { onStep(`running · pid ${pid}`); return pid; }
  }
  const log = await sh(`tail -n 5 ${q(STAGE + '/frida.log')} 2>/dev/null`).catch(() => '');
  throw new Error(log.trim() || 'started but no frida-server process appeared');
}

export async function stopFridaServer() {
  if (!current) throw new Error('No device connected.');
  await sh('pkill -f frida-server').catch(() => {});
  for (let i = 0; i < 8; i++) {
    if (!(await fridaPid())) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  await sh('pkill -9 -f frida-server').catch(() => {});
  return !(await fridaPid());
}

// ------------------------------------------------------------ file search --

/**
 * Recursive search under `root`. Runs `find` on the device (root-aware, so it
 * reaches /data/data when elevated). Directories and files are queried
 * separately because toybox `find` has no portable `-printf` for types.
 */
export async function findFiles(root, query, { limit = 400 } = {}) {
  if (!current) throw new Error('No device connected.');
  const pattern = `*${query}*`;
  const half = Math.max(20, Math.floor(limit / 2));

  const run1 = (type) =>
    sh(`find ${q(root)} -type ${type} -iname ${q(pattern)} 2>/dev/null | head -n ${half}`)
      .catch(() => '');

  const [dirs, files] = await Promise.all([run1('d'), run1('f')]);
  const toRows = (text, kind) =>
    String(text).split('\n').map((l) => l.trim()).filter(Boolean).map((path) => ({ path, kind }));

  const rows = toRows(dirs, 'd').concat(toRows(files, 'f'));
  rows.sort((a, b) => (a.kind === b.kind ? a.path.localeCompare(b.path) : a.kind === 'd' ? -1 : 1));
  return rows.slice(0, limit);
}

// ------------------------------------------------------------- wireless ---

/**
 * Attaches to a wireless device that is already paired and connected in the
 * host adb server. Builds the same `Adb` object the USB path produces, so every
 * feature works identically over Wi-Fi.
 */
export async function connectWireless(serial, onStep = () => {}) {
  onStep(`opening transport for ${serial}…`);
  const transport = await wireless.createTransport(serial);
  const adb = new Adb(transport);

  onStep('reading device info…');
  const model =
    (await withTimeout(adb.getProp('ro.product.model'), 10000, 'getprop timed out').catch(() => '')) ||
    serial;

  current = { adb, serial, model, kind: 'wifi' };
  rootMode = false;                       // re-detect per connection
  transport.disconnected.then(() => {
    if (current?.adb === adb) current = null;
  }, () => {});
  onStep(`connected · ${model} (wireless)`);
  return currentDevice();
}

export { wireless };
