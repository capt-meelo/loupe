// Run: npm test. Boots a bridge on an ephemeral port and attacks it.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { WebSocket } from 'ws';
import { startProxy } from './server.js';
import { TOKEN } from './auth.js';

const { server } = await startProxy({ port: 0, host: '127.0.0.1' });
const port = server.address().port;
test.after(() => server.close());

const call = (path, headers = {}) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port, path, headers: { host: `localhost:${port}`, ...headers } },
    (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); }).on('error', reject);
});
const auth = { authorization: `Bearer ${TOKEN}` };
const ws = (protocols, headers = {}) => new Promise((resolve) => {
  const s = new WebSocket(`ws://127.0.0.1:${port}/__loupe/adb/socket?serial=x&service=y`, protocols,
    { headers: { host: `localhost:${port}`, ...headers } });
  s.on('open', () => { s.terminate(); resolve('open'); });
  s.on('error', () => resolve('refused'));
});

test('no token is unauthorized', async () => assert.equal(await call('/__loupe/info'), 401));
test('wrong token is unauthorized', async () => assert.equal(await call('/__loupe/info', { authorization: 'Bearer nope' }), 401));
test('right token works', async () => assert.equal(await call('/__loupe/info', auth), 200));
test('rebinding Host is refused even with the token', async () => assert.equal(await call('/__loupe/info', { ...auth, host: 'evil.example' }), 403));
test('forged Origin is refused even with the token', async () => assert.equal(await call('/__loupe/info', { ...auth, origin: 'http://evil.example' }), 403));
test('session: same-origin gets the token', async () => assert.equal(await call('/__loupe/session', { 'sec-fetch-site': 'same-origin' }), 200));
test('session: a raw client with no browser headers is refused', async () => assert.equal(await call('/__loupe/session'), 403));
test('a LAN peer is refused even with Host: localhost (the gate checks the socket, not headers)', async () => {
  const { accessOk } = await import('./adb-bridge.js');
  const req = (addr) => ({ socket: { remoteAddress: addr }, headers: { host: 'localhost:5173' } });
  assert.equal(accessOk(req('192.168.0.77')), false); assert.equal(accessOk(req('10.0.0.5')), false); assert.equal(accessOk(req('::ffff:192.168.1.9')), false);
  assert.equal(accessOk(req('127.0.0.1')), true);
});
test('session: cross-site is refused', async () => assert.equal(await call('/__loupe/session', { 'sec-fetch-site': 'cross-site' }), 403));
test('session: bad Host is refused', async () => assert.equal(await call('/__loupe/session', { host: 'evil.example' }), 403));
test('websocket without a token is refused', async () => assert.equal(await ws([]), 'refused'));
test('websocket with a wrong token is refused', async () => assert.equal(await ws(['loupe.nope']), 'refused'));
test('websocket with the token upgrades', async () => assert.equal(await ws([`loupe.${TOKEN}`]), 'open'));
test('websocket with the token but a forged Origin is refused', async () =>
  assert.equal(await ws([`loupe.${TOKEN}`], { origin: 'http://evil.example' }), 'refused'));
