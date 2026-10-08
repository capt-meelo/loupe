// Run: npm test. The apksig launcher (needs the managed toolchain) and the archive code, checked against
// apksigner-signed fixtures (proxy/fixtures).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { openZip, readEntry } from './zipfile.js';
import crypto from 'node:crypto';
import * as toolchain from './toolchain.js';
import { runVerify } from './jadx.js';
import { extractTarGz } from './tar.js';

const fx = (n) => new URL(`./fixtures/${n}`, import.meta.url).pathname;

// ── zip hardening ────────────────────────────────────────────────────────────
function zipOf(name, method, comp, unc, data) {
  const n = Buffer.from(name), lh = Buffer.alloc(30), ch = Buffer.alloc(46), e = Buffer.alloc(22);
  lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(method, 8); lh.writeUInt32LE(comp, 18); lh.writeUInt32LE(unc, 22); lh.writeUInt16LE(n.length, 26);
  ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(method, 10); ch.writeUInt32LE(comp, 20); ch.writeUInt32LE(unc, 24); ch.writeUInt16LE(n.length, 28);
  const local = Buffer.concat([lh, n, data]), cd = Buffer.concat([ch, n]);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(1, 8); e.writeUInt16LE(1, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(local.length, 16);
  return Buffer.concat([local, cd, e]);
}
test('zip: an entry that lies about its size cannot inflate past the declared size', async () => {
  const bomb = zlib.deflateRawSync(Buffer.alloc(20 * 1024 * 1024));
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zb-'));
  fs.writeFileSync(path.join(d, 'b.zip'), zipOf('x.bin', 8, bomb.length, 1000, bomb));
  const z = await openZip(path.join(d, 'b.zip'));
  await assert.rejects(() => readEntry(z, z.entries[0]));
  fs.rmSync(d, { recursive: true, force: true });
});

// ── tar extraction ───────────────────────────────────────────────────────────
function tarEntry(name, { type = '0', body = '', mode = 0o644, link = '' } = {}) {
  const h = Buffer.alloc(512);
  h.write(name, 0); h.write(mode.toString(8).padStart(7, '0') + '\0', 100); h.write(Buffer.byteLength(body).toString(8).padStart(11, '0') + '\0', 124);
  h.write(type, 156); h.write(link, 157); h.write('ustar\0', 257);
  h.fill(0x20, 148, 156); let sum = 0; for (const b of h) sum += b; h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
  const data = Buffer.from(body);
  return Buffer.concat([h, data, Buffer.alloc((512 - (data.length % 512)) % 512)]);
}
const tgz = (entries) => zlib.gzipSync(Buffer.concat([...entries, Buffer.alloc(1024)]));
async function extract(entries) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'tar-'));
  fs.writeFileSync(path.join(d, 'a.tgz'), tgz(entries));
  try { await extractTarGz(path.join(d, 'a.tgz'), path.join(d, 'out')); return d; } catch (e) { fs.rmSync(d, { recursive: true, force: true }); throw e; }
}
test('tar: extracts files, dirs, exec bits and safe symlinks', { skip: process.platform === 'win32' && 'POSIX modes' }, async () => {
  const d = await extract([tarEntry('jre/', { type: '5', mode: 0o755 }), tarEntry('jre/bin/java', { body: '#!/bin/sh\n', mode: 0o755 }), tarEntry('jre/lib/libx.so', { body: 'x' }), tarEntry('jre/bin/j', { type: '2', link: 'java' }), tarEntry('jre/l', { type: '2', link: 'lib/libx.so' })]);
  const o = path.join(d, 'out', 'jre');
  assert.equal(fs.readFileSync(path.join(o, 'bin', 'java'), 'utf8'), '#!/bin/sh\n');
  assert.ok(fs.statSync(path.join(o, 'bin', 'java')).mode & 0o100, 'exec bit kept');
  assert.equal(fs.readlinkSync(path.join(o, 'bin', 'j')), 'java');
  fs.rmSync(d, { recursive: true, force: true });
});
for (const [name, entries, re] of [
  ['a ../ path', [tarEntry('../evil', { body: 'x' })], /unsafe path/],
  ['an absolute path', [tarEntry('/etc/evil', { body: 'x' })], /unsafe path/],
  ['a nested ../', [tarEntry('a/../../evil', { body: 'x' })], /unsafe path/],
  ['a symlink out of the tree', [tarEntry('l', { type: '2', link: '../../etc' })], /symlink leaves/],
  ['an absolute symlink', [tarEntry('l', { type: '2', link: '/etc' })], /symlink leaves/]
]) test(`tar: refuses ${name}`, async () => { await assert.rejects(() => extract(entries), re); });
test('tar: does not write through a pre-existing symlink', { skip: process.platform === 'win32' && 'POSIX' }, async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'tar-'));
  const victim = path.join(d, 'victim.txt'); fs.writeFileSync(victim, 'safe');
  fs.mkdirSync(path.join(d, 'out')); fs.symlinkSync(victim, path.join(d, 'out', 'f'));
  fs.writeFileSync(path.join(d, 'a.tgz'), tgz([tarEntry('f', { body: 'pwned' })]));
  await extractTarGz(path.join(d, 'a.tgz'), path.join(d, 'out'));
  assert.equal(fs.readFileSync(victim, 'utf8'), 'safe');
  fs.rmSync(d, { recursive: true, force: true });
});

test('zip: a compressed size near 4 GiB is refused before any allocation', async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zc-'));
  fs.writeFileSync(path.join(d, 'c.zip'), zipOf('big.bin', 8, 0xfffffff0, 10, Buffer.from('xx')));
  await assert.rejects(() => openZip(path.join(d, 'c.zip')), /too large|past the archive/);
  fs.rmSync(d, { recursive: true, force: true });
});
test('zip: data that runs past the central directory is refused', async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zc-'));
  fs.writeFileSync(path.join(d, 'c.zip'), zipOf('big.bin', 8, 5000, 10, Buffer.from('xx')));
  await assert.rejects(() => openZip(path.join(d, 'c.zip')), /past the archive/);
  fs.rmSync(d, { recursive: true, force: true });
});
test('zip: a stored entry whose sizes disagree is refused', async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zc-'));
  fs.writeFileSync(path.join(d, 'c.zip'), zipOf('s.bin', 0, 2, 9, Buffer.from('xx')));
  await assert.rejects(() => openZip(path.join(d, 'c.zip')), /mismatched sizes/);
  fs.rmSync(d, { recursive: true, force: true });
});


// ── signatures: apksig (bundled in jadx's jar) via proxy/apk/Verify.class ────
const tc = process.env.LOUPE_TOOLS ? toolchain.resolve() : null;
const sig = { skip: !tc && 'needs the managed toolchain (LOUPE_TOOLS)' };
const check = (n) => runVerify(tc, fx(n), 24);           // fixtures declare minSdk 15, which would demand v1 RSA-SHA1
const verdicts = (r) => Object.fromEntries(Object.entries(r.schemes).filter(([, v]) => v.present).map(([k, v]) => [k, v.verified]));
test('signature: RSA v1+v2+v3 verifies', sig, async () => { const r = await check('rsa-v1v2v3.apk'); assert.equal(r.verified, true); assert.equal(r.signers.length, 1); assert.ok(verdicts(r).v2 && verdicts(r).v3); });
test('signature: v1-only verifies', sig, async () => assert.deepEqual(verdicts(await check('rsa-v1.apk')), { v1: true }));
test('signature: a tampered APK does not verify', sig, async () => {
  for (const n of ['tampered-rsa-v1v2v3.apk']) {
    const r = await check(n);
    assert.equal(r.verified, false, n);
    assert.ok(r.errors.length + r.warnings.length + Object.values(r.schemes).flatMap((v) => v.errors || []).length > 0, `${n} says why`);
  }
});
test('signature: an unsigned APK is reported, not trusted', sig, async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'uns-')), f = path.join(d, 'u.apk');
  fs.writeFileSync(f, zipOf('AndroidManifest.xml', 0, 3, 3, Buffer.from('abc')));
  const r = await runVerify(tc, f, 24);
  assert.equal(r.verified, false);
  assert.match([...r.warnings, ...r.errors].join(' '), /unsigned|no .*signature|JAR_SIG_NO_SIGNATURES|APK Signature Scheme/i);
});
