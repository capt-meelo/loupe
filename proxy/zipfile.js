/**
 * Minimal zip reader (central directory, stored + deflate). Used for APK
 * analysis, the upload preflight, and unpacking the jadx download. Hostile
 * input: every size is checked before it drives an allocation, and inflation is
 * capped, so a bomb fails instead of exhausting memory.
 */
import fsp from 'node:fs/promises';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { PassThrough, pipeline } from 'node:stream';

const LIMITS = {
  entries: 200_000, total: 3 * 1024 ** 3, entry: 1024 ** 3, compressed: 3 * 1024 ** 3, directory: 64 * 1024 * 1024
};

export async function openZip(file, lim = LIMITS) {
  const fh = await fsp.open(file, 'r');
  try {
    const { size } = await fh.stat();
    const tail = Buffer.alloc(Math.min(size, 65557));
    await fh.read(tail, 0, tail.length, size - tail.length);
    const at = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (at < 0) throw new Error('not a zip/APK file');
    const count = tail.readUInt16LE(at + 10), cdSize = tail.readUInt32LE(at + 12), cdOff = tail.readUInt32LE(at + 16);
    if (count === 0xffff || cdSize === 0xffffffff || cdOff === 0xffffffff) throw new Error('zip64 archives are not supported');
    if (count > lim.entries) throw new Error(`too many entries (${count})`);
    if (cdSize > lim.directory || cdOff + cdSize > size) throw new Error('corrupt zip directory');

    const cd = Buffer.alloc(cdSize);
    await fh.read(cd, 0, cdSize, cdOff);
    const entries = [];
    let p = 0, total = 0;
    for (let i = 0; i < count; i++) {
      if (p + 46 > cdSize || cd.readUInt32LE(p) !== 0x02014b50) throw new Error('corrupt zip directory');
      const nl = cd.readUInt16LE(p + 28), el = cd.readUInt16LE(p + 30), cl = cd.readUInt16LE(p + 32);
      const e = {
        name: cd.toString('utf8', p + 46, p + 46 + nl), method: cd.readUInt16LE(p + 10),
        comp: cd.readUInt32LE(p + 20), unc: cd.readUInt32LE(p + 24), offset: cd.readUInt32LE(p + 42)
      };
      if (e.name.startsWith('/') || e.name.split(/[\\/]/).includes('..')) throw new Error(`unsafe entry name: ${e.name.slice(0, 80)}`);
      if (e.unc > lim.entry || e.comp > lim.compressed) throw new Error(`entry too large: ${e.name.slice(0, 80)}`);
      if (e.method === 0 && e.comp !== e.unc) throw new Error(`stored entry has mismatched sizes: ${e.name.slice(0, 80)}`);
      if (e.offset + 30 + e.comp > cdOff) throw new Error(`entry data runs past the archive: ${e.name.slice(0, 80)}`);
      total += e.unc;
      entries.push(e);
      p += 46 + nl + el + cl;
    }
    if (total > lim.total) throw new Error(`expands to ${Math.round(total / 1024 ** 2)} MB, over the limit`);
    return { file, size, entries, cdOffset: cdOff, cdSize, byName: new Map(entries.map((e) => [e.name, e])), total };
  } finally { await fh.close(); }
}

/** Where an entry's bytes start (the local header has its own name/extra lengths). */
async function dataStart(fh, e) {
  const h = Buffer.alloc(30);
  await fh.read(h, 0, 30, e.offset);
  if (h.readUInt32LE(0) !== 0x04034b50) throw new Error(`bad local header for ${e.name}`);
  return e.offset + 30 + h.readUInt16LE(26) + h.readUInt16LE(28);
}

/** Whole entry in memory, capped (default 256 MB). */
export async function readEntry(zip, e, max = 256 * 1024 ** 2) {
  if (e.unc > max || e.comp > max) throw new Error(`${e.name} is too large to read in memory`);
  const fh = await fsp.open(zip.file, 'r');
  try {
    const start = await dataStart(fh, e);
    if (start + e.comp > zip.cdOffset) throw new Error(`${e.name}: data runs past the archive`);
    const raw = Buffer.alloc(e.comp);
    const { bytesRead } = await fh.read(raw, 0, e.comp, start);
    if (bytesRead !== e.comp) throw new Error(`${e.name}: truncated`);
    if (e.method === 0) return raw;
    if (e.method === 8) return zlib.inflateRawSync(raw, { maxOutputLength: Math.max(e.unc, 1) + 1 });
    throw new Error(`unsupported compression method ${e.method} for ${e.name}`);
  } finally { await fh.close(); }
}

/** Entry as a stream (for large files such as the jadx jar). Errors from any stage reach the consumer. */
export async function streamEntry(zip, e) {
  const fh = await fsp.open(zip.file, 'r');
  let start;
  try { start = await dataStart(fh, e); } finally { await fh.close(); }
  if (start + e.comp > zip.cdOffset) throw new Error(`${e.name}: data runs past the archive`);
  if (e.method !== 0 && e.method !== 8) throw new Error(`unsupported compression method ${e.method} for ${e.name}`);
  const out = new PassThrough();
  const src = fs.createReadStream(zip.file, { start, end: start + e.comp - 1 });
  pipeline(src, ...(e.method === 8 ? [zlib.createInflateRaw()] : []), out, (err) => { if (err) out.destroy(err); });
  return out;
}
