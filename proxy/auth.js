/**
 * Bridge authentication.
 *
 * `accessOk` (loopback + Origin allow-list) lets requests with no Origin through,
 * and the bridge listens on 0.0.0.0, so on its own it is too weak for routes that
 * spawn processes and read files. Every /__loupe/* request must also carry a
 * per-launch random token, and a Host that is a loopback name (which blunts DNS
 * rebinding). The page gets the token from /__loupe/session, which only answers
 * same-origin browser requests.
 */
import crypto from 'node:crypto';

export const TOKEN = crypto.randomBytes(32).toString('hex');

const HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
export const hostOk = (req) => HOST_RE.test(req.headers.host || '');

const eq = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Bearer header for fetches; `loupe.<token>` subprotocol for WebSockets (they can't set headers). */
export function tokenOf(req) {
  const m = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
  if (m) return m[1];
  const p = String(req.headers['sec-websocket-protocol'] || '').split(',').map((s) => s.trim())
    .find((s) => s.startsWith('loupe.'));
  return p ? p.slice(6) : '';
}

export const tokenOk = (req) => eq(tokenOf(req), TOKEN);

/** ws option: echo our token subprotocol so the browser accepts the upgrade. */
export const handleProtocols = (protocols) => [...protocols].find((p) => p.startsWith('loupe.')) || false;
