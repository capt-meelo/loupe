/**
 * APK decompiler API (/__loupe/jadx/*): a job runner behind a viewer.
 *
 * jadx comes from a private toolchain Loupe downloads on request (toolchain.js) and runs
 * inside an OS sandbox (sandbox.js). The APK and everything derived from it is attacker-controlled: every read goes
 * through `jail`, nothing is ever served as HTML. See docs/plan-decompiler.md.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { spawn } from 'node:child_process';
import { wrap, selfTest } from './sandbox.js';
import { openZip } from './zipfile.js';
import * as toolchain from './toolchain.js';

const ROOT = process.env.LOUPE_HOME || path.join(os.homedir(), '.loupe');
const CACHE = path.join(ROOT, 'decompiled');
const TMP = path.join(ROOT, '.tmp');
const UPLOADS = path.join(TMP, 'uploads');
const L = {
  upload: 1024 ** 3, out: 4 * 1024 ** 3, cache: 10 * 1024 ** 3,
  timeout: Number(process.env.LOUPE_JADX_TIMEOUT_MS) || 30 * 60_000,
  file: 2 * 1024 ** 2, raw: 25 * 1024 ** 2, page: 500, uploadTtl: 3_600_000, recent: 600_000,
  search: { q: 200, results: 500, files: 100_000, fileBytes: 512 * 1024 ** 2, ms: 6000 }
};
const ID = /^[a-f0-9]{64}$/;
const NOSNIFF = { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };

class HttpErr extends Error { constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; } }
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', ...NOSNIFF }); res.end(JSON.stringify(body)); };
const exists = (p) => fsp.access(p).then(() => true, () => false);
const rand = () => crypto.randomBytes(8).toString('hex');

let ready = false;
function init() {
  if (ready) return;
  fs.rmSync(TMP, { recursive: true, force: true });          // leftovers from a crashed run
  fs.mkdirSync(UPLOADS, { recursive: true });
  fs.mkdirSync(CACHE, { recursive: true });
  ready = true;
}

/** Total bytes under a directory (never follows symlinks). Portable replacement for `du`. */
async function dirSize(dir) {
  let n = 0;
  for (const e of await fsp.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) n += await dirSize(p);
    else if (e.isFile()) n += (await fsp.lstat(p).catch(() => ({ size: 0 }))).size;
  }
  return n;
}

// ── uploads ─────────────────────────────────────────────────────────────────
const uploads = new Map();
setInterval(() => {
  for (const [id, u] of uploads) if (Date.now() - u.ts > L.uploadTtl) { uploads.delete(id); fs.rm(u.path, { force: true }, () => {}); }
}, 60_000).unref();

async function upload(req, res, url) {
  const role = url.searchParams.get('role') === 'split' ? 'split' : 'base';
  const name = (url.searchParams.get('name') || 'app.apk').replace(/[^\w.\-]/g, '_').slice(0, 80);
  if (Number(req.headers['content-length']) > L.upload) throw new HttpErr(413, 'file too large');
  await fsp.mkdir(UPLOADS, { recursive: true });                 // survives someone clearing ~/.loupe while the bridge runs
  const id = rand(), file = path.join(UPLOADS, `${id}.apk`);
  const hash = crypto.createHash('sha256'), md5 = crypto.createHash('md5');
  let size = 0, tooBig = false;
  const ws = fs.createWriteStream(file, { mode: 0o600 });
  req.on('data', (c) => { hash.update(c); md5.update(c); size += c.length; if (size > L.upload) { tooBig = true; req.destroy(); } });
  try { await pipeline(req, ws); }
  catch (e) { await fsp.rm(file, { force: true }); throw new HttpErr(tooBig ? 413 : 500, tooBig ? 'file is over the 1 GiB limit' : `upload failed: ${e.code || e.message}`); }
  let info;
  try { info = { entries: (await openZip(file)).entries.length }; }       // openZip validates the directory: counts, sizes, names, bounds
  catch (e) { await fsp.rm(file, { force: true }); throw new HttpErr(422, e.message); }
  const u = { path: file, sha: hash.digest('hex'), md5: md5.digest('hex'), size, role, name, ts: Date.now() };
  uploads.set(id, u);
  json(res, 200, { ok: true, upload: id, sha256: u.sha, size, entries: info.entries });
}

// ── jobs ────────────────────────────────────────────────────────────────────
const jobs = new Map();
const queue = [];
let current = null;
const finished = (s) => s === 'done' || s === 'error' || s === 'cancelled';
const pub = (j) => ({ ok: true, id: j.id, state: j.state, pct: j.pct, msg: j.msg, warnings: j.warnings, errors: j.errors, error: j.error });

function emit(job) {
  const msg = `data: ${JSON.stringify(pub(job))}\n\n`;
  for (const r of job.listeners) r.write(msg);
  if (finished(job.state)) { for (const r of job.listeners) r.end(); job.listeners.clear(); }
}

function cleanOptions(o = {}) {
  const int = (v, lo, hi, d) => (Number.isInteger(v) && v >= lo && v <= hi ? v : d);
  return {
    deobf: o.deobf === true, deobfMin: int(o.deobfMin, 1, 20, 3), deobfMax: int(o.deobfMax, 8, 255, 64),
    useSourceName: o.useSourceName === true, showBadCode: o.showBadCode !== false
  };
}
const flagsOf = (o) => [
  '--log-level', 'warn',
  ...(o.showBadCode ? ['--show-bad-code'] : []),
  ...(o.deobf ? ['--deobf', '--deobf-min', String(o.deobfMin), '--deobf-max', String(o.deobfMax), ...(o.useSourceName ? ['--deobf-use-sourcename'] : [])] : [])
];

async function open(body) {
  init();
  const parts = (Array.isArray(body.uploads) ? body.uploads : []).map((id) => uploads.get(id));
  if (!parts.length || parts.some((u) => !u)) throw new HttpErr(400, 'unknown or expired upload');
  parts.sort((a, b) => (a.role === b.role ? a.sha.localeCompare(b.sha) : a.role === 'base' ? -1 : 1));
  if (parts[0].role !== 'base') throw new HttpErr(400, 'a base APK is required');

  const options = cleanOptions(body.options);
  const tc = toolchain.resolve();
  if (!tc) throw new HttpErr(424, 'Decompiling needs the one-time Java and jadx download.', { code: 'no-toolchain' });
  const box = await selfTest(ROOT);
  if (!box.ok) throw new HttpErr(409, `Decompiling is off here: ${box.reason}.`, { code: 'no-sandbox' });
  const flags = flagsOf(options);
  const key = crypto.createHash('sha256').update(JSON.stringify({ v: 3, tool: tc.version === 'custom' ? await jarFingerprint(tc.jar) : tc.version, flags, parts: parts.map((p) => [p.role, p.sha]) })).digest('hex');

  if (await exists(path.join(CACHE, key, 'meta.json'))) return { ok: true, id: key, state: 'done', pct: 100 };
  const live = jobs.get(key);
  if (live && !finished(live.state)) { live.refs++; return pub(live); }          // single-flight

  const job = { id: key, state: 'queued', pct: 0, msg: 'queued', refs: 1, listeners: new Set(), parts, options, flags, tc, warnings: 0, errors: 0, tail: [] };
  jobs.set(key, job);
  queue.push(job);
  pump();
  return pub(job);
}

/** A LOUPE_JADX_JAR override has no version, so identify it by content (memoized per file+mtime). */
const fingerprints = new Map();
async function jarFingerprint(jar) {
  const st = await fsp.stat(jar), k = `${jar}:${st.size}:${st.mtimeMs}`;
  if (!fingerprints.has(k)) fingerprints.set(k, crypto.createHash('sha256').update(await fsp.readFile(jar)).digest('hex'));
  return fingerprints.get(k);
}

function pump() {
  if (current || !queue.length) return;
  current = queue.shift();
  runJob(current).catch((e) => fail(current, e.message)).finally(() => { current = null; pump(); });
}

function fail(job, message) { if (finished(job.state)) return; job.state = 'error'; job.error = message; emit(job); }

const killJob = (job) => { try { process.kill(-job.proc.pid, 'SIGKILL'); } catch { /* already gone */ } };   // POSIX-only, like the sandbox
process.on('exit', () => { if (current?.proc) { try { process.kill(-current.proc.pid, 'SIGKILL'); } catch { /* gone */ } } });

async function runJob(job) {
  job.state = 'running'; job.msg = 'starting'; emit(job);
  const dir = path.join(TMP, `${job.id.slice(0, 12)}-${rand()}`);
  const [inD, outD, tmpD, homeD] = ['in', 'out', 'tmp', 'home'].map((n) => path.join(dir, n));
  for (const d of [inD, outD, tmpD, homeD]) await fsp.mkdir(d, { recursive: true });

  const inputs = [];
  for (const [i, p] of job.parts.entries()) {
    const dst = path.join(inD, p.role === 'base' ? 'base.apk' : `split-${i}.apk`);
    await fsp.link(p.path, dst).catch(() => fsp.copyFile(p.path, dst));
    inputs.push(dst);
  }
  try {
    await runFull(job, dir, inD, outD, tmpD, homeD, inputs);
    if (job.state === 'error' || job.state === 'cancelled') return;
    await publish(job, inD, outD);
  } finally { await fsp.rm(dir, { recursive: true, force: true }); }
}

/** jadx in the sandbox. Only a clean finish is published. */
async function runFull(job, dir, inD, outD, tmpD, homeD, inputs) {
  const tc = job.tc;
  if (/\s/.test(dir)) throw new Error('Full decompile needs LOUPE_HOME without spaces (JVM options are space-separated)');
  // Big apps (30k+ classes) need real heap. Half the RAM, at most 8 GB; LOUPE_JADX_XMX_MB overrides.
  const xmx = Number(process.env.LOUPE_JADX_XMX_MB) || Math.max(1024, Math.min(8192, Math.floor(os.totalmem() / 2 / 1048576)));
  // JVM limits go in argv (not only the environment) so they hold under any sandbox, including bwrap's --clearenv.
  const args = [`-Xmx${xmx}m`, `-Djava.io.tmpdir=${tmpD}`, `-Duser.home=${homeD}`, '-cp', tc.jar, 'jadx.cli.JadxCLI', ...job.flags, '-d', outD, '-j', String(Math.max(2, Math.min(12, os.cpus().length))), ...inputs];
  const env = { PATH: path.dirname(tc.java), HOME: homeD, LANG: 'en_US.UTF-8' };
  const w = wrap(tc.java, args, { ro: [inD, ...tc.ro], rw: [outD, tmpD, homeD], profileDir: dir, env });

  let why = null;
  job.proc = spawn(w.cmd, w.args, { env, cwd: tmpD, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const onData = (chunk) => {
    for (const line of chunk.toString().split(/[\r\n]+/)) {
      const m = /progress: (\d+) of (\d+)/.exec(line);
      if (m) { job.pct = Math.min(99, Math.round((m[1] / m[2]) * 100)); job.msg = `decompiling ${m[1]} of ${m[2]}`; emit(job); continue; }
      if (!line.trim() || line.startsWith('Picked up')) continue;
      const fe = /^ERROR\s+-\s+finished with errors, count: (\d+)\s*$/.exec(line);   // informational only: labels the result partial
      if (fe) job.errors = Number(fe[1]);
      if (/\bWARN\b/.test(line)) job.warnings++;
      if (/\bERROR\b/.test(line) && !fe) job.errors++;
      if (!job.firstError && /^(Exception in thread|java\.lang\.\w*(Error|Exception)|ERROR\b)/.test(line)) job.firstError = line.slice(0, 300);   // the cause, not the stack that follows it
      job.tail.push(line.slice(0, 300)); if (job.tail.length > 30) job.tail.shift();
    }
  };
  job.proc.stdout.on('data', onData); job.proc.stderr.on('data', onData);

  const timer = setTimeout(() => { why = 'timed out'; killJob(job); }, L.timeout);
  const watchdog = setInterval(async () => { if (await dirSize(outD) > L.out) { why = 'output exceeded the size limit'; killJob(job); } }, 2000);
  const { code, signal } = await new Promise((resolve) => { job.proc.on('error', () => resolve({ code: -1 })); job.proc.on('close', (code, signal) => resolve({ code, signal })); });
  clearTimeout(timer); clearInterval(watchdog);

  if (job.cancelled) { job.state = 'cancelled'; job.msg = 'cancelled'; emit(job); return; }
  if (why) return fail(job, why);
  // jadx 1.5.0 (JadxCLI.processAndSave) returns 0 whenever it finishes, even if some classes failed (it only logs
  // "finished with errors, count: N"), and 1 for load failures and exceptions. So only exit code 0 is a success;
  // log text is never trusted to turn a failure into one (an APK can put anything in an identifier).
  if (code !== 0 || signal) {
    const oom = /OutOfMemoryError/.test(job.firstError || '') || job.tail.some((l) => /OutOfMemoryError/.test(l));
    return fail(job, oom ? `jadx ran out of memory (heap limit ${xmx} MB). Set LOUPE_JADX_XMX_MB higher and try again.` : job.firstError || job.tail.slice(-4).join('\n') || `jadx exited with ${signal || 'code ' + code} before finishing`);
  }
  if (!(await exists(path.join(outD, 'sources'))) && !(await exists(path.join(outD, 'resources')))) return fail(job, 'jadx finished but wrote nothing');
}

async function countFiles(dir) {
  let n = 0;
  const walk = async (d) => { for (const e of await fsp.readdir(d, { withFileTypes: true }).catch(() => [])) { if (e.isDirectory()) await walk(path.join(d, e.name)); else if (e.isFile()) n++; } };
  await walk(dir);
  return n;
}

async function publish(job, inD, outD) {
  const final = path.join(CACHE, job.id);
  await fsp.rm(final, { recursive: true, force: true });
  await fsp.mkdir(final, { recursive: true });
  await fsp.rename(outD, path.join(final, 'out'));
  await fsp.rename(inD, path.join(final, 'in'));
  const files = await countFiles(path.join(final, 'out', 'sources'));
  const bytes = await dirSize(final);
  await fsp.writeFile(path.join(final, 'meta.json'), JSON.stringify({
    id: job.id, name: job.parts[0].name, createdAt: Date.now(), tool: `jadx ${job.tc.version}`,
    options: job.options, parts: job.parts.map((p) => ({ role: p.role, sha256: p.sha, md5: p.md5, size: p.size })),
    sourceFiles: files, warnings: job.warnings, errors: job.errors, partial: job.errors > 0, bytes
  }));
  job.state = 'done'; job.pct = 100; job.msg = 'done'; emit(job);
  evict().catch(() => {});
}

/** LRU eviction under a disk quota; never touches active jobs or recently used entries. */
const lastUsed = new Map();
const touch = (id) => lastUsed.set(id, Date.now());
async function evict() {
  const items = [];
  for (const id of await fsp.readdir(CACHE).catch(() => [])) {
    const meta = await fsp.readFile(path.join(CACHE, id, 'meta.json'), 'utf8').then(JSON.parse, () => null);
    if (meta) items.push({ id, bytes: meta.bytes || 0, used: lastUsed.get(id) || meta.createdAt });
  }
  let total = items.reduce((a, i) => a + i.bytes, 0);
  for (const it of items.sort((a, b) => a.used - b.used)) {
    if (total <= L.cache) break;
    const active = jobs.get(it.id) && !finished(jobs.get(it.id).state);
    if (active || Date.now() - it.used < L.recent) continue;
    await fsp.rm(path.join(CACHE, it.id), { recursive: true, force: true });
    total -= it.bytes;
  }
}

function cancel(id) {
  const job = jobs.get(id);
  if (!job || finished(job.state)) return { ok: true, state: job?.state || 'unknown' };
  if (--job.refs > 0) return { ok: true, state: job.state, refs: job.refs };       // someone else still needs it
  job.cancelled = true;
  if (job.state === 'queued') { queue.splice(queue.indexOf(job), 1); job.state = 'cancelled'; emit(job); }
  else killJob(job);
  return { ok: true, state: 'cancelling' };
}

function watch(req, res, id) {
  const job = jobs.get(id);
  res.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive', ...NOSNIFF });
  const done = !job && fs.existsSync(path.join(CACHE, id, 'meta.json'));
  if (!job && !done) { res.write(`data: ${JSON.stringify({ ok: false, state: 'error', error: 'unknown job' })}\n\n`); res.end(); return; }
  if (done) { res.write(`data: ${JSON.stringify({ ok: true, id, state: 'done', pct: 100 })}\n\n`); res.end(); return; }
  res.write(`data: ${JSON.stringify(pub(job))}\n\n`);
  if (finished(job.state)) { res.end(); return; }
  job.listeners.add(res);
  req.on('close', () => job.listeners.delete(res));
}

// ── reading the output (all jailed) ─────────────────────────────────────────
async function cacheDir(id) {
  if (!ID.test(id || '')) throw new HttpErr(400, 'bad id');
  if (!(await exists(path.join(CACHE, id, 'meta.json')))) throw new HttpErr(404, 'not decompiled (or evicted)');
  touch(id);
  return path.join(CACHE, id);
}

/** Resolve `rel` under the job's out/ dir: no `..`, no absolute paths, never through a symlink. */
async function jail(id, rel = '') {
  const base = path.join(await cacheDir(id), 'out');
  if (rel.includes('\0') || path.isAbsolute(rel) || rel.split(/[\\/]/).includes('..')) throw new HttpErr(400, 'bad path');
  let cur = base;
  for (const seg of rel.split('/').filter(Boolean)) {
    cur = path.join(cur, seg);
    const st = await fsp.lstat(cur).catch(() => { throw new HttpErr(404, 'not found'); });
    if (st.isSymbolicLink()) throw new HttpErr(403, 'symlinks are not followed');
  }
  const [real, rb] = [await fsp.realpath(cur), await fsp.realpath(base)];
  if (real !== rb && !real.startsWith(rb + path.sep)) throw new HttpErr(403, 'outside the output');
  return cur;
}

/** One level of the tree, packages with a single child folded together (com/android/x as one row). */
async function tree(id, rel, cursor) {
  const dir = await jail(id, rel);
  const list = (await fsp.readdir(dir, { withFileTypes: true })).filter((e) => !e.isSymbolicLink());
  list.sort((a, b) => (a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1));
  const page = list.slice(cursor, cursor + L.page);
  const entries = [];
  for (const e of page) {
    if (!e.isDirectory()) { const st = await fsp.stat(path.join(dir, e.name)); entries.push({ n: e.name, p: rel ? `${rel}/${e.name}` : e.name, d: false, s: st.size }); continue; }
    let name = e.name, abs = path.join(dir, e.name);
    for (let i = 0; i < 12; i++) {
      const kids = (await fsp.readdir(abs, { withFileTypes: true })).filter((k) => !k.isSymbolicLink());
      if (kids.length !== 1 || !kids[0].isDirectory()) break;
      name += `/${kids[0].name}`; abs = path.join(abs, kids[0].name);
    }
    entries.push({ n: name, p: rel ? `${rel}/${name}` : name, d: true });
  }
  return { entries, next: cursor + L.page < list.length ? cursor + L.page : null };
}

async function readText(id, rel, res) {
  const f = await jail(id, rel);
  const st = await fsp.lstat(f);
  if (!st.isFile()) throw new HttpErr(400, 'not a file');
  const fh = await fsp.open(f, 'r');
  let head;
  try { head = Buffer.alloc(Math.min(st.size, HEX_BYTES)); await fh.read(head, 0, head.length, 0); } finally { await fh.close(); }
  if (head.subarray(0, 8192).includes(0)) {
    if (IMG[path.extname(f).slice(1).toLowerCase()]) throw new HttpErr(415, 'binary file', { code: 'binary' });
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', ...NOSNIFF });
    return res.end(hexDump(head, st.size));
  }
  if (st.size > L.file) throw new HttpErr(413, `file is ${Math.round(st.size / 1024)} KB, over the text limit`, { code: 'too-big' });
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', ...NOSNIFF });
  res.end(await fsp.readFile(f));
}

const HEX_BYTES = 64 * 1024;
function hexDump(buf, total) {
  const rows = [`// binary file, ${Math.round(total / 1024)} KB${total > buf.length ? `, showing the first ${buf.length / 1024} KB` : ''}`];
  for (let i = 0; i < buf.length; i += 16) {
    const c = buf.subarray(i, i + 16);
    const hex = [...c].map((b) => b.toString(16).padStart(2, '0')).join(' ').padEnd(47);
    rows.push(`${i.toString(16).padStart(8, '0')}  ${hex}  ${[...c].map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('')}`);
  }
  return rows.join('\n');
}

const IMG = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
async function raw(id, rel, res) {
  const f = await jail(id, rel);
  const st = await fsp.lstat(f);
  if (!st.isFile()) throw new HttpErr(400, 'not a file');
  if (st.size > L.raw) throw new HttpErr(413, 'too large to preview');
  const type = IMG[path.extname(f).slice(1).toLowerCase()];
  res.writeHead(200, {
    'Content-Type': type || 'application/octet-stream', 'Content-Length': st.size, ...NOSNIFF,
    'Content-Security-Policy': "default-src 'none'; sandbox",
    ...(type ? {} : { 'Content-Disposition': `attachment; filename="${path.basename(f).replace(/[^\w.\-]/g, '_')}"` })
  });
  fs.createReadStream(f).pipe(res);
}

const searches = new Map();
async function search(req, res, id, p) {
  const root = await cacheDir(id);
  const q = p.get('q') || '';
  if (!q || q.length > L.search.q) throw new HttpErr(400, `query must be 1 to ${L.search.q} characters`);
  const scope = ['code', 'res', 'all', 'names'].includes(p.get('scope')) ? p.get('scope') : 'all';
  const k = `${id}:${(p.get('ch') || 'search').slice(0, 20)}`;
  searches.get(k)?.terminate();                                // one active search per channel
  const worker = new Worker(new URL('./jadx-search.js', import.meta.url), {
    workerData: { root: path.join(root, 'out'), q, scope, regex: p.get('regex') === '1', cs: p.get('case') === '1', word: p.get('word') === '1',
      maxResults: L.search.results, maxFiles: L.search.files, maxFileBytes: L.search.fileBytes }
  });
  searches.set(k, worker);
  const results = [];
  let truncated = false, timedOut = false, error = null, ended = false;
  const end = () => { if (ended) return; ended = true; clearTimeout(timer); if (searches.get(k) === worker) searches.delete(k); worker.terminate(); if (!res.writableEnded) json(res, 200, { ok: !error, error, results, truncated, timedOut }); };
  const timer = setTimeout(() => { timedOut = true; end(); }, L.search.ms);
  worker.on('message', (m) => { if (m.r) results.push(...m.r); if (m.done) { truncated = !!m.truncated; error = m.error || null; end(); } });
  worker.on('error', (e) => { error = e.message; end(); });
  res.on('close', () => { if (!ended) { ended = true; clearTimeout(timer); worker.terminate(); } });   // client went away or typed again
}

// ── APK facts ───────────────────────────────────────────────────────────────
/**
 * Signature check with Google's apksig, which jadx's own jar already bundles. `proxy/apk/Verify.class` calls it and prints JSON.
 * It runs in the same sandbox as jadx (the APK is hostile) and the verdict is cached per entry.
 */
async function signature(dir) {
  const cache = path.join(dir, 'sig.json');
  const hit = await fsp.readFile(cache, 'utf8').then(JSON.parse, () => null);
  if (hit) return hit;
  const tc = toolchain.resolve();
  if (!tc) return { error: 'the Java toolchain is not installed' };
  const out = await runVerify(tc, path.join(dir, 'in', 'base.apk'));
  if (!out.error) await fsp.writeFile(cache, JSON.stringify(out)).catch(() => {});
  return out;
}

const VERIFY_DIR = fileURLToPath(new URL('./apk/', import.meta.url));
export async function runVerify(tc, apk, minSdk) {
  await fsp.mkdir(TMP, { recursive: true });
  const work = await fsp.mkdtemp(path.join(TMP, 'sig-'));
  try {
    const args = ['-Xmx512m', `-Djava.io.tmpdir=${work}`, `-Duser.home=${work}`, '-cp', [tc.jar, VERIFY_DIR].join(path.delimiter), 'Verify', apk, ...(minSdk ? [String(minSdk)] : [])];
    const env = { PATH: path.dirname(tc.java), HOME: work, LANG: 'en_US.UTF-8' };
    const w = wrap(tc.java, args, { ro: [path.dirname(apk), VERIFY_DIR, ...tc.ro], rw: [work], profileDir: work, env });
    return await new Promise((resolve) => {
      const p = spawn(w.cmd, w.args, { env, cwd: work, stdio: ['ignore', 'pipe', 'pipe'] });
      let o = '', e = '';
      const t = setTimeout(() => { p.kill('SIGKILL'); resolve({ error: 'timed out' }); }, 60_000);
      p.stdout.on('data', (c) => { if (o.length < 1 << 20) o += c; });
      p.stderr.on('data', (c) => { if (e.length < 4096) e += c; });
      p.on('error', (x) => { clearTimeout(t); resolve({ error: x.message }); });
      p.on('close', (code) => {
        clearTimeout(t);
        try { resolve(JSON.parse(o)); } catch { resolve({ error: (e.split('\n').find((l) => l.trim()) || `verifier exited with ${code}`).slice(0, 200) }); }
      });
    });
  } finally { await fsp.rm(work, { recursive: true, force: true }); }
}

const DENSITY = ['xxxhdpi', 'xxhdpi', 'xhdpi', 'hdpi', 'mdpi'];
/** Name, package, version and launcher icon, read from the decoded manifest and resources. */
async function manifestFacts(dir) {
  const res = path.join(dir, 'out', 'resources');
  const mf = await fsp.readFile(path.join(res, 'AndroidManifest.xml'), 'utf8').catch(() => '');
  const attr = (re) => re.exec(mf)?.[1] ?? null;
  const app = /<application\b[^>]*>/.exec(mf)?.[0] || '';
  const appAttr = (n) => new RegExp(`android:${n}="([^"]*)"`).exec(app)?.[1] ?? null;
  let label = appAttr('label');
  if (label?.startsWith('@string/')) {
    const strings = await fsp.readFile(path.join(res, 'res', 'values', 'strings.xml'), 'utf8').catch(() => '');
    const n = label.slice(8).replace(/[.$^]/g, '\\$&');
    label = new RegExp(`<string name="${n}"[^>]*>([^<]*)</string>`).exec(strings)?.[1] ?? null;
  }
  let icon = null;
  const ref = /^@(mipmap|drawable)\/([\w.]+)$/.exec(appAttr('icon') || '');
  if (ref) {
    const dirs = (await fsp.readdir(path.join(res, 'res')).catch(() => [])).filter((d) => d.startsWith(ref[1]));
    const rank = (d) => { const i = DENSITY.findIndex((x) => d.includes(x)); return i < 0 ? 9 : i; };
    for (const d of dirs.sort((x, y) => rank(x) - rank(y))) {
      const f = `res/${d}/${ref[2]}.png`;
      if (await exists(path.join(res, f))) { icon = `resources/${f}`; break; }
    }
  }
  return {
    package: attr(/<manifest[^>]*\spackage="([^"]+)"/), versionName: attr(/android:versionName="([^"]*)"/), versionCode: attr(/android:versionCode="([^"]*)"/),
    minSdk: attr(/android:minSdkVersion="([^"]*)"/), targetSdk: attr(/android:targetSdkVersion="([^"]*)"/),
    debuggable: attr(/android:debuggable="([^"]*)"/), allowBackup: attr(/android:allowBackup="([^"]*)"/), cleartext: attr(/android:usesCleartextTraffic="([^"]*)"/),
    label, icon
  };
}

async function info(id) {
  const dir = await cacheDir(id);
  const meta = JSON.parse(await fsp.readFile(path.join(dir, 'meta.json'), 'utf8'));
  const manifest = await manifestFacts(dir);
  return { ok: true, meta, manifest, signature: await signature(dir) };
}

async function recent() {
  const out = [];
  for (const id of await fsp.readdir(CACHE).catch(() => [])) {
    const m = await fsp.readFile(path.join(CACHE, id, 'meta.json'), 'utf8').then(JSON.parse, () => null);
    if (!m) continue;
    if (m.parts?.[0] && !m.parts[0].md5) {                     // scans from before md5 was recorded
      const h = crypto.createHash('md5');
      try { await pipeline(fs.createReadStream(path.join(CACHE, id, 'in', 'base.apk')), h); m.parts[0].md5 = h.digest('hex'); await fsp.writeFile(path.join(CACHE, id, 'meta.json'), JSON.stringify(m)); } catch { /* input gone */ }
    }
    const f = await manifestFacts(path.join(CACHE, id)).catch(() => ({}));
    out.push({
      id, name: m.name, createdAt: m.createdAt, sourceFiles: m.sourceFiles, bytes: m.bytes, errors: m.errors, partial: m.partial,
      md5: m.parts?.[0]?.md5, apkSize: m.parts?.[0]?.size, deobf: !!m.options?.deobf, files: m.parts?.length || 1,
      package: f.package, label: f.label, versionName: f.versionName, versionCode: f.versionCode, minSdk: f.minSdk, targetSdk: f.targetSdk, icon: f.icon
    });
  }
  return out.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
}

async function forget(id) {
  if (!ID.test(id || '')) throw new HttpErr(400, 'bad id');
  const j = jobs.get(id);
  if (j && !finished(j.state)) throw new HttpErr(409, 'still decompiling');
  jobs.delete(id);
  await fsp.rm(path.join(CACHE, id), { recursive: true, force: true });
}

const readJson = (req, max = 65536) => new Promise((resolve, reject) => {
  let b = '';
  req.on('data', (c) => { b += c; if (b.length > max) { req.destroy(); reject(new HttpErr(413, 'body too large')); } });
  req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { reject(new HttpErr(400, 'bad json')); } });
});

export async function handleJadxApi(req, res, route) {
  try {
    init();
    const url = new URL(req.url, 'http://x');
    const p = url.searchParams, id = p.get('id') || '', rel = p.get('path') || p.get('dir') || '';
    const is = (m, r) => req.method === m && route === `/__loupe/jadx/${r}`;

    if (is('GET', 'status')) return json(res, 200, { ok: true, platform: process.platform, toolchain: await toolchain.status() });
    if (is('POST', 'toolchain')) { toolchain.install().catch(() => {}); return json(res, 200, { ok: true, toolchain: await toolchain.status() }); }
    if (is('POST', 'upload')) return await upload(req, res, url);
    if (is('POST', 'open')) {
      let gone = false;
      res.on('close', () => { if (!res.writableEnded) gone = true; });
      const job = await open(await readJson(req));
      if (gone || res.destroyed) { cancel(job.id); return; }       // the browser gave up before it learned the id: release its hold on the job
      return json(res, 200, job);
    }
    if (is('GET', 'job')) { if (!ID.test(id)) throw new HttpErr(400, 'bad id'); return watch(req, res, id); }
    if (is('DELETE', 'job')) { if (!ID.test(id)) throw new HttpErr(400, 'bad id'); return json(res, 200, cancel(id)); }
    if (is('GET', 'tree')) return json(res, 200, { ok: true, ...(await tree(id, rel, Math.max(0, Number(p.get('cursor')) || 0))) });
    if (is('GET', 'file')) return await readText(id, rel, res);
    if (is('GET', 'raw')) return await raw(id, rel, res);
    if (is('GET', 'search')) return await search(req, res, id, p);
    if (is('GET', 'info')) return json(res, 200, await info(id));
    if (is('GET', 'recent')) return json(res, 200, { ok: true, items: await recent() });
    if (is('DELETE', 'recent')) { await forget(id); return json(res, 200, { ok: true }); }
    throw new HttpErr(404, 'unknown route');
  } catch (e) {
    if (!res.headersSent) json(res, e.status || 500, { ok: false, error: e.message, ...e.extra });
    else res.end();
  }
}
