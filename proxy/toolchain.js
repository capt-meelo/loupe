/**
 * The decompiler's private toolchain: a Java runtime and jadx, downloaded once on
 * request into ~/.loupe/tools so nobody has to install anything. Every download is
 * pinned by SHA-256 in toolchain-manifest.json, checked before use, extracted
 * defensively and published atomically (a half install is never visible).
 * Nothing is fetched until the user asks (POST /jadx/toolchain).
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { extractTarGz } from './tar.js';
import { openZip, streamEntry } from './zipfile.js';
import { sandboxKind, selfTest } from './sandbox.js';

const run = promisify(execFile);
const manifest = JSON.parse(fs.readFileSync(new URL('./toolchain-manifest.json', import.meta.url), 'utf8'));
const TOOLS = () => process.env.LOUPE_TOOLS || path.join(process.env.LOUPE_HOME || path.join(os.homedir(), '.loupe'), 'tools');
const key = `${process.platform}-${process.arch}`;
const entry = () => manifest.jre.platforms[key] || null;

let installing = null;                // single-flight promise
let progress = { phase: '', done: 0, total: 0 };
let lastError = null;

const installedFile = () => path.join(TOOLS(), 'installed.json');
const jreDir = () => path.join(TOOLS(), `jre-${manifest.jre.version}-${key}`);
const jadxDir = () => path.join(TOOLS(), `jadx-${manifest.jadx.version}`);

/** What the decompiler would run, or null when not installed. LOUPE_JAVA / LOUPE_JADX_JAR override (tests, advanced users). */
export function resolve() {
  if (process.env.LOUPE_JAVA && process.env.LOUPE_JADX_JAR) {
    return { java: process.env.LOUPE_JAVA, jar: process.env.LOUPE_JADX_JAR, ro: [path.dirname(path.dirname(process.env.LOUPE_JAVA)), path.dirname(process.env.LOUPE_JADX_JAR)], version: 'custom' };
  }
  const e = entry();
  if (!e) return null;
  try {
    const rec = JSON.parse(fs.readFileSync(installedFile(), 'utf8'));
    if (rec.jre !== manifest.jre.version || rec.jadx !== manifest.jadx.version || rec.key !== key) return null;
    const java = path.join(jreDir(), ...e.java.split('/'));
    const jar = path.join(jadxDir(), manifest.jadx.jar.split('/').join(path.sep));
    if (!fs.existsSync(java) || !fs.existsSync(jar)) return null;
    return { java, jar, ro: [jreDir(), jadxDir()], version: manifest.jadx.version };
  } catch { return null; }
}

const WINDOWS_HINT = 'Windows has no sandbox for jadx. Run Loupe inside WSL2 (Ubuntu) and open it from Windows Chrome, see the README';

export async function status() {
  const e = entry();
  const box = await selfTest(path.dirname(TOOLS()));
  const sizeMB = e ? Math.round((e.size + manifest.jadx.size) / 1024 ** 2) : 0;
  return {
    supported: !!e && box.ok, reason: process.platform === 'win32' ? WINDOWS_HINT : !e ? `no Java runtime is pinned for ${key}` : box.ok ? '' : box.reason,
    sandbox: box.ok ? box.kind : null, installed: !!resolve(), version: manifest.jadx.version, installing: !!installing,
    progress, error: lastError, sizeMB, platform: key
  };
}

// ── download ────────────────────────────────────────────────────────────────
function fetchTo(url, dest, { sha256, size }, hop = 0) {
  return new Promise((resolve, reject) => {
    if (hop > 5) return reject(new Error('too many redirects'));
    const u = new URL(url);
    if (u.protocol !== 'https:') return reject(new Error(`refusing a non-HTTPS download: ${url}`));
    https.get(u, { headers: { 'User-Agent': 'loupe-toolchain' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(fetchTo(new URL(res.headers.location, u).toString(), dest, { sha256, size }, hop + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`download failed: HTTP ${res.statusCode}`)); }
      const hash = crypto.createHash('sha256');
      let got = 0;
      progress.total = size;
      res.on('data', (c) => {
        hash.update(c); got += c.length; progress.done = got;
        if (got > size + 1024 * 1024) res.destroy(new Error('download is larger than expected'));
      });
      pipeline(res, fs.createWriteStream(dest, { mode: 0o600 })).then(() => {
        const sum = hash.digest('hex');
        if (sum !== sha256) return reject(new Error(`checksum mismatch (got ${sum.slice(0, 12)}…, expected ${sha256.slice(0, 12)}…); refusing to install`));
        resolve();
      }, reject);
    }).on('error', reject);
  });
}

async function doInstall() {
  const e = entry();
  if (!e) throw new Error(`no Java runtime is pinned for ${key}`);
  const root = TOOLS();
  await fsp.mkdir(root, { recursive: true });
  const work = await fsp.mkdtemp(path.join(root, '.partial-'));
  try {
    // Java runtime
    progress = { phase: 'downloading Java runtime', done: 0, total: e.size };
    const tgz = path.join(work, 'jre.tar.gz');
    await fetchTo(e.url, tgz, e);
    progress = { phase: 'unpacking Java runtime', done: 0, total: 0 };
    const jreOut = path.join(work, 'jre');
    await extractTarGz(tgz, jreOut);
    await fsp.rm(tgz);

    // jadx
    progress = { phase: 'downloading jadx', done: 0, total: manifest.jadx.size };
    const zipFile = path.join(work, 'jadx.zip');
    await fetchTo(manifest.jadx.url, zipFile, manifest.jadx);
    progress = { phase: 'unpacking jadx', done: 0, total: 0 };
    const zip = await openZip(zipFile);
    const jarEntry = zip.byName.get(manifest.jadx.jar);
    if (!jarEntry) throw new Error('jadx archive has an unexpected layout');
    const jadxOut = path.join(work, 'jadx', ...manifest.jadx.jar.split('/'));
    await fsp.mkdir(path.dirname(jadxOut), { recursive: true });
    await pipeline(await streamEntry(zip, jarEntry), fs.createWriteStream(jadxOut, { mode: 0o644 }));
    await fsp.rm(zipFile);

    // Does it actually run on this machine? (wrong arch, missing libc, etc.)
    progress = { phase: 'checking it runs', done: 0, total: 0 };
    const java = path.join(jreOut, ...e.java.split('/'));
    const { stdout, stderr } = await run(java, ['-cp', jadxOut, 'jadx.cli.JadxCLI', '--version'], { timeout: 60_000 });
    if (!/\d+\.\d+\.\d+/.test(stdout + stderr)) throw new Error('jadx did not report a version');

    // Publish atomically: dirs first, the record last.
    await fsp.rm(jreDir(), { recursive: true, force: true }); await fsp.rm(jadxDir(), { recursive: true, force: true });
    await fsp.rename(jreOut, jreDir());
    await fsp.rename(path.join(work, 'jadx'), jadxDir());
    await fsp.writeFile(installedFile(), JSON.stringify({ key, jre: manifest.jre.version, jadx: manifest.jadx.version, at: Date.now() }));
    // Drop versions this build no longer pins.
    for (const d of await fsp.readdir(root)) {
      const keep = [path.basename(jreDir()), path.basename(jadxDir()), 'installed.json'];
      if (!keep.includes(d) && /^(jre|jadx)-/.test(d)) await fsp.rm(path.join(root, d), { recursive: true, force: true });
    }
    progress = { phase: 'done', done: 1, total: 1 };
  } finally { await fsp.rm(work, { recursive: true, force: true }); }
}

/** Starts (or joins) the install. Resolves when finished. */
export function install() {
  if (!sandboxKind()) return Promise.reject(new Error('no OS sandbox, so full decompilation stays off'));
  if (!installing) {
    lastError = null;
    installing = doInstall().catch((e) => { lastError = e.message; progress = { phase: '', done: 0, total: 0 }; throw e; }).finally(() => { installing = null; });
    installing.catch(() => {});
  }
  return installing;
}
