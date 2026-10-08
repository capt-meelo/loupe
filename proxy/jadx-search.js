/**
 * Search worker: scans one decompiled tree. Runs in a worker thread so a
 * catastrophic regex or a huge tree can never block the bridge; the parent
 * terminates it on timeout, on a newer search, or when the client goes away.
 */
import fs from 'node:fs';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { parentPort, workerData } from 'node:worker_threads';

const { root, q, scope, regex, cs, word, maxResults, maxFiles, maxFileBytes } = workerData;
const BINARY = /\.(png|jpe?g|gif|webp|ico|dex|so|arsc|ttf|otf|mp3|mp4|ogg|wav|zip|jar|apk|class|bin|dat|pb|0)$/i;

let rx = null;
if (scope !== 'names') {
  const src = regex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try { rx = new RegExp(word ? `\\b(?:${src})\\b` : src, cs ? 'g' : 'gi'); }
  catch (e) { parentPort.postMessage({ done: true, error: 'bad pattern: ' + e.message }); process.exit(0); }
}
const needle = q.toLowerCase();

let found = 0, scanned = 0, batch = [];
const flush = () => { if (batch.length) { parentPort.postMessage({ r: batch }); batch = []; } };
const full = () => found >= maxResults || scanned >= maxFiles;

function* walk(dir, rel = '') {
  let list;
  try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  list.sort((a, b) => a.name.localeCompare(b.name));
  for (const d of list) {
    if (d.isSymbolicLink()) continue;                       // never follow links
    const r = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) yield* walk(path.join(dir, d.name), r);
    else if (d.isFile()) yield r;
  }
}

/** Streams a file in 1 MiB pieces so a huge dump (every method reference of a big app) never sits in memory. */
function scanFile(abs, rel) {
  const fd = fs.openSync(abs, 'r');
  const buf = Buffer.alloc(1024 * 1024), dec = new StringDecoder('utf8');
  let carry = '', lineNo = 0, first = true, skipping = false;
  const test = (line) => {
    lineNo++;
    if (line.length > 5000 || full()) return;                  // minified blobs: skip, don't hang
    rx.lastIndex = 0;
    const m = rx.exec(line);
    if (!m) return;
    found++;
    const from = Math.max(0, m.index - 60);
    batch.push({ p: rel, l: lineNo, c: m.index, n: m[0].length || 1, t: line.slice(from, from + 200), o: m.index - from });
  };
  try {
    for (let n; (n = fs.readSync(fd, buf, 0, buf.length, null)) > 0 && !full();) {
      if (first) { first = false; if (buf.subarray(0, Math.min(n, 8192)).includes(0)) return; }   // binary
      const parts = (carry + dec.write(buf.subarray(0, n))).split('\n');
      carry = parts.pop();
      for (const line of parts) { if (skipping) { skipping = false; lineNo++; continue; } test(line); if (full()) break; }
      if (carry.length > 5000) { carry = ''; skipping = true; }   // a line with no end in sight: drop it
    }
    if (carry && !skipping) test(carry);
  } finally { fs.closeSync(fd); }
}

const roots = scope === 'res' ? ['resources'] : scope === 'code' ? ['sources'] : ['sources', 'resources'];
outer:
for (const top of roots) {
  for (const rel of walk(path.join(root, top), top)) {
    if (full()) break outer;
    if (scope === 'names') {
      if (rel.toLowerCase().includes(needle)) { found++; batch.push({ p: rel }); }
      continue;
    }
    if (BINARY.test(rel)) continue;
    const abs = path.join(root, rel);
    let st; try { st = fs.lstatSync(abs); } catch { continue; }
    if (!st.isFile() || st.size > maxFileBytes) continue;
    scanned++;
    scanFile(abs, rel);
    if (batch.length >= 50) flush();
  }
}
flush();
parentPort.postMessage({ done: true, truncated: full(), scanned });
