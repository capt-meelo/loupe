/** Client for the bridge's decompiler API (/__loupe/jadx/*). See proxy/jadx.js. */
import { bridgeFetch } from './bridge.js';

const B = '/__loupe/jadx';
const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();

async function ok(res) {
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) throw Object.assign(new Error(j.error || `bridge said ${res.status}`), { code: j.code, status: res.status });
  return j;
}

export const status = () => bridgeFetch(`${B}/status`).then(ok);
/** Starts the one-time download of Java + jadx; poll status() for progress. */
export const installToolchain = () => bridgeFetch(`${B}/toolchain`, { method: 'POST' }).then(ok);
export const recent = () => bridgeFetch(`${B}/recent`).then(ok).then((j) => j.items);
export const forget = (id) => bridgeFetch(`${B}/recent?${qs({ id })}`, { method: 'DELETE' }).then(ok);
export const upload = (blob, name, role, signal) => bridgeFetch(`${B}/upload?${qs({ name, role })}`, { method: 'POST', body: blob, signal }).then(ok);
export const open = (uploads, options, signal) =>
  bridgeFetch(`${B}/open`, { method: 'POST', body: JSON.stringify({ uploads, options }), signal }).then(ok);
export const cancel = (id) => bridgeFetch(`${B}/job?${qs({ id })}`, { method: 'DELETE' }).then(ok);
export const tree = (id, dir, cursor) => bridgeFetch(`${B}/tree?${qs({ id, dir, cursor })}`).then(ok);
export const info = (id) => bridgeFetch(`${B}/info?${qs({ id })}`).then(ok);

export async function file(id, path) {
  const r = await bridgeFetch(`${B}/file?${qs({ id, path })}`);
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw Object.assign(new Error(j.error || `bridge said ${r.status}`), { code: j.code }); }
  return r.text();
}

/** Images can't carry an Authorization header, so fetch the bytes and hand back an object URL. */
export async function rawUrl(id, path) {
  const r = await bridgeFetch(`${B}/raw?${qs({ id, path })}`);
  if (!r.ok) throw new Error(`bridge said ${r.status}`);
  return URL.createObjectURL(await r.blob());
}

/** `ch` keeps independent searches (typing, quick-open, findings) from cancelling each other. */
export const search = (id, q, { scope = 'all', regex, cs, word, ch = 'search' } = {}, signal) =>
  bridgeFetch(`${B}/search?${qs({ id, q, scope, regex: regex ? 1 : '', case: cs ? 1 : '', word: word ? 1 : '', ch })}`, { signal }).then(ok);

/** Job progress as server-sent events; resolves with the final event. */
export async function watch(id, onEvent, signal) {
  const r = await bridgeFetch(`${B}/job?${qs({ id })}`, { signal });
  let last = null, buf = '';
  const dec = new TextDecoder();
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const m = /^data: (.+)$/m.exec(buf.slice(0, i)); buf = buf.slice(i + 2);
      if (m) { last = JSON.parse(m[1]); onEvent(last); }
    }
  }
  return last;
}
