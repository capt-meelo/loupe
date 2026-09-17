/**
 * The Loupe Node bridge.
 *
 * Runs alongside the Vite dev server and hosts the loopback-only `/__loupe/*`
 * API the page can't do from a sandboxed browser: the ADB relay, the Frida
 * tunnel, certificate preparation for the Proxy panel, and this machine's LAN
 * addresses (suggested as the device-proxy host). It is not itself a proxy for
 * device traffic; the Proxy panel points the device at the user's own tool.
 */
import http from 'node:http';
import os from 'node:os';
import net from 'node:net';
import { handleAdbApi, attachAdbSockets, accessOk } from './adb-bridge.js';
import { handleFridaApi, attachFridaSockets } from './frida.js';
import { handleCertApi } from './cert.js';

function localAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) out.push({ name, address: ni.address });
    }
  }
  return out;
}

const cors = (req, res) => {
  if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
};

export function startProxy({ port = 8080, host = '0.0.0.0' } = {}) {
  const server = http.createServer((req, res) => {
    const path = req.url.split('?')[0];
    // Every endpoint reaches the device or the network on the user's behalf, so
    // it is loopback + allowed-origin only, same gate for all of /__loupe.
    if (!accessOk(req)) { res.writeHead(403).end(); return; }
    cors(req, res);
    if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }

    if (path.startsWith('/__loupe/adb/')) { handleAdbApi(req, res, path); return; }
    if (path.startsWith('/__loupe/frida/')) { handleFridaApi(req, res, path, { cors }); return; }
    if (path.startsWith('/__loupe/cert/')) { handleCertApi(req, res, path); return; }
    if (path === '/__loupe/info') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, addresses: localAddresses() }));
      return;
    }
    if (path === '/__loupe/proxy/test') {
      const u = new URL(req.url, 'http://x');
      const host = u.searchParams.get('host');
      const port = Number(u.searchParams.get('port'));
      if (!host || !port) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: 'host and port required' })); return; }
      const sock = net.connect({ host, port, timeout: 4000 });
      const done = (ok, error) => { try { sock.destroy(); } catch { /* gone */ } res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok, error })); };
      sock.once('connect', () => done(true));
      sock.once('timeout', () => done(false, 'timed out'));
      sock.once('error', (e) => done(false, e.code || e.message));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Loupe bridge.');
  });

  attachAdbSockets(server);   // /__loupe/adb/socket relay
  attachFridaSockets(server, { accessOk });   // /__loupe/frida/session

  return new Promise((resolve, reject) => {
    // A busy port emits 'error' asynchronously. Without this handler it becomes
    // an unhandled 'error' event and crashes the whole process (and the Vite dev
    // server with it). Reject instead so the caller can report it and move on.
    const onError = (err) => reject(err);
    server.once('error', onError);
    server.listen(port, host, () => {
      server.removeListener('error', onError);
      resolve({ server, port, addresses: localAddresses() });
    });
  });
}

// Standalone: `node proxy/server.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2]) || 8080;
  startProxy({ port }).then(() => {
    console.log(`Loupe bridge listening on :${port}`);
  }).catch((err) => {
    console.error(err.code === 'EADDRINUSE'
      ? `Port ${port} is already in use. Another Loupe bridge is probably running.`
      : `Bridge failed to start: ${err.message}`);
    process.exit(1);
  });
}
