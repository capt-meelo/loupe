/**
 * Streaming .tar.gz extractor (ustar, PAX and GNU long names), for unpacking the
 * downloaded Java runtime without needing a `tar` binary (Windows lacks one in
 * some setups). The archive is hash-verified before this runs, but extraction is
 * still defensive: no absolute paths, no `..`, symlinks may not leave the tree.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { once } from 'node:events';

class Pull {
  constructor(stream) { this.it = stream[Symbol.asyncIterator](); this.buf = Buffer.alloc(0); }
  async more() { const { value, done } = await this.it.next(); if (done) throw new Error('unexpected end of archive'); return value; }
  async take(n) {
    while (this.buf.length < n) this.buf = Buffer.concat([this.buf, await this.more()]);
    const out = this.buf.subarray(0, n); this.buf = this.buf.subarray(n); return out;
  }
  async copy(ws, n) {
    while (n > 0) {
      if (!this.buf.length) this.buf = await this.more();
      const k = Math.min(n, this.buf.length);
      const part = this.buf.subarray(0, k); this.buf = this.buf.subarray(k); n -= k;
      if (ws && !ws.write(part)) await once(ws, 'drain');
    }
  }
}

const str = (b, o, n) => { const s = b.toString('utf8', o, o + n); const z = s.indexOf('\0'); return z < 0 ? s : s.slice(0, z); };
const oct = (b, o, n) => {
  if (b[o] & 0x80) { let v = 0; for (let i = 1; i < n; i++) v = v * 256 + b[o + i]; return v; }   // base-256 for huge sizes
  return parseInt(str(b, o, n).trim() || '0', 8);
};
const pax = (text) => { const out = {}; for (let p = 0; p < text.length;) { const sp = text.indexOf(' ', p); const len = parseInt(text.slice(p, sp), 10); if (!len) break; const rec = text.slice(sp + 1, p + len - 1); const eq = rec.indexOf('='); out[rec.slice(0, eq)] = rec.slice(eq + 1); p += len; } return out; };

function inside(root, target) { const r = path.relative(root, target); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); }

export async function extractTarGz(file, dest, { maxBytes = 2 * 1024 ** 3, maxFiles = 100_000 } = {}) {
  const root = path.resolve(dest);
  await fsp.mkdir(root, { recursive: true });
  const src = fs.createReadStream(file).pipe(zlib.createGunzip());
  const pull = new Pull(src);
  let longName = null, longLink = null, paxAttrs = {}, total = 0, files = 0;

  for (;;) {
    const h = await pull.take(512);
    if (h.every((b) => b === 0)) break;                                   // end-of-archive marker
    let name = str(h, 0, 100); const prefix = str(h, 345, 155);
    if (prefix && str(h, 257, 5) === 'ustar') name = `${prefix}/${name}`;
    const type = String.fromCharCode(h[156] || 0x30), mode = oct(h, 100, 8);
    let size = oct(h, 124, 12), link = str(h, 157, 100);
    const pad = (512 - (size % 512)) % 512;

    if (type === 'x' || type === 'L' || type === 'K' || type === 'g') {
      if (size > 1024 * 1024) throw new Error('oversized archive header');
      const body = (await pull.take(size)).toString('utf8'); await pull.take(pad);
      if (type === 'x') paxAttrs = pax(body); else if (type === 'L') longName = body.replace(/\0.*$/s, ''); else if (type === 'K') longLink = body.replace(/\0.*$/s, '');
      continue;
    }
    if (paxAttrs.path) name = paxAttrs.path; else if (longName) name = longName;
    if (paxAttrs.linkpath) link = paxAttrs.linkpath; else if (longLink) link = longLink;
    if (paxAttrs.size) size = Number(paxAttrs.size);
    paxAttrs = {}; longName = longLink = null;

    const rel = name.replace(/^(\.\/)+/, '');
    if (!rel || rel.startsWith('/') || rel.split('/').includes('..') || rel.includes('\\')) throw new Error(`unsafe path in archive: ${rel.slice(0, 80)}`);
    const target = path.join(root, rel);
    if (!inside(root, target)) throw new Error(`path escapes the install dir: ${rel.slice(0, 80)}`);
    if ((total += size) > maxBytes || ++files > maxFiles) throw new Error('archive is larger than expected');

    if (type === '5') { await fsp.mkdir(target, { recursive: true }); continue; }
    if (type === '2') {
      const to = path.resolve(path.dirname(target), link);
      if (path.isAbsolute(link) || !inside(root, to)) throw new Error(`symlink leaves the install dir: ${rel.slice(0, 80)}`);
      await fsp.mkdir(path.dirname(target), { recursive: true });
      await fsp.rm(target, { force: true });
      await fsp.symlink(link, target);
      continue;
    }
    if (type === '0' || type === '7') {
      await fsp.mkdir(path.dirname(target), { recursive: true });
      await fsp.rm(target, { force: true });                              // never write through an existing symlink
      const ws = fs.createWriteStream(target, { mode: 0o600 });
      await pull.copy(ws, size);
      ws.end(); await once(ws, 'finish');
      await fsp.chmod(target, mode & 0o777 || 0o644);
      await pull.take(pad);
      continue;
    }
    await pull.copy(null, size); await pull.take(pad);                    // hard links, devices, etc.: skipped
  }
}
