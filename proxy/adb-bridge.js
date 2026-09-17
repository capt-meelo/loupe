/**
 * Wireless ADB bridge.
 *
 * A browser can't open TCP sockets, do mDNS, or perform the TLS/SPAKE2
 * handshake that Android 11+ wireless debugging requires — so none of this can
 * live in the page. Node can, and the host `adb` binary already implements
 * pairing correctly, so this exposes it over a small HTTP + WebSocket API.
 *
 * Sockets are relayed at the ADB *service* level (`shell:`, `sync:`, …) rather
 * than as a raw byte pipe. That lets the browser implement `AdbTransport`
 * against this bridge, so every existing feature — shell, sync, logcat, scrcpy —
 * works over Wi-Fi with no changes.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { WebSocketServer } from 'ws';
import { AdbServerClient } from '@yume-chan/adb';
import { AdbServerNodeTcpConnector } from '@yume-chan/adb-server-node-tcp';

const SDK_ADB = `${homedir()}/Library/Android/sdk/platform-tools/adb`;
export const ADB = existsSync(SDK_ADB) ? SDK_ADB : 'adb';

let client = null;
const getClient = () => {
  if (!client) {
    client = new AdbServerClient(
      new AdbServerNodeTcpConnector({ host: '127.0.0.1', port: 5037 })
    );
  }
  return client;
};

/** Runs the adb CLI and resolves with its combined output. */
export function adbCli(args, { timeoutMs = 60000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(ADB, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); }, timeoutMs);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, out: String(e.message) }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out: out.trim() }); });
  });
}

/** `adb mdns services` → [{ name, type, addr }] */
function parseMdns(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || /^List of/i.test(t)) continue;
    // e.g.  adb-R5CT30XXXX-abcDEF  _adb-tls-pairing._tcp.  192.168.0.42:37013
    const m = /^(\S+)\s+(_\S+\._tcp\.?)\s+(\S+:\d+)$/.exec(t);
    if (m) rows.push({ name: m[1], type: m[2].replace(/\.$/, ''), addr: m[3] });
  }
  return rows;
}

/**
 * Access guard.
 *
 * The bridge listens on 0.0.0.0 so a Wi-Fi phone can reach it, which puts this
 * API on the LAN too — and "the ADB API" means arbitrary shell on the attached
 * device. Two gates, because either alone is insufficient:
 *
 *  - loopback only, so no other host on the network can reach it;
 *  - Origin allow-list, because any web page you happen to have open can also
 *    reach localhost. Plain CORS doesn't cover it: WebSockets ignore CORS
 *    entirely, so the service relay needs this check explicitly.
 */
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173', 'http://127.0.0.1:5173',   // vite dev
  'http://localhost:4173', 'http://127.0.0.1:4173'    // vite preview
]);

export function accessOk(req) {
  if (!LOOPBACK.has(req.socket?.remoteAddress || '')) return false;
  const origin = req.headers.origin;
  // No Origin means a non-browser caller (curl, a test), already limited to
  // loopback above. A browser always sends one here — the page is on another port.
  return !origin || ALLOWED_ORIGINS.has(origin);
}

const json = (res, code, body, req) => {
  const origin = req?.headers?.origin;
  res.writeHead(code, {
    'Content-Type': 'application/json',
    ...(origin && ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {})
  });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => { b += c; });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } });
  });

/** Handles /__loupe/adb/* . Returns true if it took the request. */
export async function handleAdbApi(req, res, path) {
  if (!path.startsWith('/__loupe/adb/')) return false;

  if (!accessOk(req)) { json(res, 403, { ok: false, error: 'forbidden' }, req); return true; }

  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    res.writeHead(204, {
      ...(origin && ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    });
    res.end();
    return true;
  }

  try {
    if (path === '/__loupe/adb/mdns') {
      const { out } = await adbCli(['mdns', 'services'], { timeoutMs: 12000 });
      json(res, 200, { ok: true, services: parseMdns(out), raw: out }, req);
      return true;
    }

    if (path === '/__loupe/adb/devices') {
      const { out, code } = await adbCli(['devices', '-l'], { timeoutMs: 12000 });
      const devices = out.split('\n').slice(1)
        .map((l) => l.trim()).filter(Boolean)
        .map((l) => {
          const [serial, state, ...rest] = l.split(/\s+/);
          const info = Object.fromEntries(
            rest.map((kv) => kv.split(':')).filter((p) => p.length === 2)
          );
          return { serial, state, model: info.model, device: info.device, product: info.product };
        })
        .filter((d) => d.serial);
      json(res, 200, { ok: code === 0, devices, raw: out }, req);
      return true;
    }

    if (path === '/__loupe/adb/pair' && req.method === 'POST') {
      const { addr, code: pairCode } = await readBody(req);
      if (!addr || !pairCode) { json(res, 400, { ok: false, error: 'addr and code required' }, req); return true; }
      const { out, code } = await adbCli(['pair', addr, String(pairCode)], { timeoutMs: 45000 });
      json(res, 200, { ok: code === 0 && /success/i.test(out), output: out }, req);
      return true;
    }

    if (path === '/__loupe/adb/connect' && req.method === 'POST') {
      const { addr } = await readBody(req);
      if (!addr) { json(res, 400, { ok: false, error: 'addr required' }, req); return true; }
      const { out, code } = await adbCli(['connect', addr], { timeoutMs: 30000 });
      json(res, 200, { ok: code === 0 && /connected/i.test(out), output: out }, req);
      return true;
    }

    // Banner data the browser transport needs to construct an Adb instance.
    if (path.startsWith('/__loupe/adb/info')) {
      const serial = new URL(req.url, 'http://x').searchParams.get('serial');
      if (!serial) { json(res, 400, { ok: false, error: 'serial required' }, req); return true; }
      const c = getClient();
      const devices = await c.getDevices();
      const dev = devices.find((d) => d.serial === serial);
      if (!dev) { json(res, 404, { ok: false, error: 'device not connected' }, req); return true; }
      // Note the shape: getDeviceFeatures resolves to { transportId, features },
      // not a bare array. Without the feature list the browser would think the
      // device lacks shell_v2/stat_v2 and silently take slower code paths.
      let features = [];
      try {
        const probe = await c.getDeviceFeatures({ serial });
        features = probe?.features ?? [];
      } catch { /* an older adb may not answer host:features */ }
      json(res, 200, {
        ok: true,
        serial: dev.serial,
        state: dev.state ?? 'device',
        product: dev.product ?? '',
        model: dev.model ?? '',
        device: dev.device ?? '',
        features: Array.from(features),
        maxPayloadSize: 1024 * 1024
      }, req);
      return true;
    }

    if (path === '/__loupe/adb/kill-server' && req.method === 'POST') {
      const { out } = await adbCli(['kill-server'], { timeoutMs: 15000 });
      client = null;   // its connection is gone with the server
      json(res, 200, { ok: true, output: out || 'adb server stopped' }, req);
      return true;
    }

    json(res, 404, { ok: false, error: 'unknown adb endpoint' }, req);
    return true;
  } catch (e) {
    json(res, 500, { ok: false, error: String(e?.message || e) }, req);
    return true;
  }
}

/**
 * Upgrades /__loupe/adb/socket?serial=&service= into a byte relay between the
 * browser and an ADB service on the device.
 */
export function attachAdbSockets(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname !== '/__loupe/adb/socket') return;      // leave others alone
    if (!accessOk(req)) { socket.destroy(); return; }

    wss.handleUpgrade(req, socket, head, (ws) => {
      const serial = url.searchParams.get('serial');
      const service = url.searchParams.get('service');
      if (!serial || !service) { ws.close(1008, 'serial and service required'); return; }

      // The browser sees `onopen` the moment the upgrade completes, but opening
      // the ADB service takes a round trip or two. Services that speak first —
      // `sync:` sends its LIST/STAT request immediately, and so do shell stdin
      // and the scrcpy control socket — would have those frames dropped if the
      // message listener were installed after the await. So install it now and
      // queue until the device socket exists.
      const pending = [];
      let writer = null;
      let closed = false;
      let chain = Promise.resolve();

      const toBytes = (data) =>
        Array.isArray(data) ? new Uint8Array(Buffer.concat(data))
          : data instanceof ArrayBuffer ? new Uint8Array(data)
            : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

      // Writes stay strictly ordered: the sync protocol is a byte stream, so a
      // reordered chunk corrupts it rather than merely delaying it.
      const pump = (bytes) => {
        chain = chain
          .then(() => writer.write(bytes))
          .catch(() => { try { ws.close(1011, 'write failed'); } catch { /* gone */ } });
      };

      ws.on('message', (data) => {
        const bytes = toBytes(data);
        if (writer) pump(bytes); else pending.push(bytes);
      });

      let adbSocket = null;
      const shutdown = () => {
        closed = true;
        chain.then(() => writer?.close()).catch(() => {});
        adbSocket?.close?.()?.catch?.(() => {});
      };
      ws.on('close', shutdown);
      ws.on('error', shutdown);

      (async () => {
        try {
          const transport = await getClient().createTransport({ serial });
          adbSocket = await transport.connect(service);
        } catch (e) {
          try { ws.close(1011, String(e?.message || e).slice(0, 120)); } catch { /* gone */ }
          return;
        }
        if (closed) { adbSocket.close?.().catch?.(() => {}); return; }

        writer = adbSocket.writable.getWriter();
        for (const bytes of pending) pump(bytes);
        pending.length = 0;

        // device -> browser
        try {
          const reader = adbSocket.readable.getReader();
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            if (ws.readyState === ws.OPEN) ws.send(value);
          }
        } catch { /* closed */ }
        if (ws.readyState === ws.OPEN) ws.close(1000, 'eof');
      })();
    });
  });
}
