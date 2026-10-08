// Run: npm test. Exercises the decompiler API. Failure handling runs against a stub "java"; the real-jadx
// cases need the managed toolchain (set LOUPE_TOOLS, or LOUPE_TEST_INSTALL=1 to download it) and a sample
// APK (LOUPE_TEST_APK or ../loupe-blog/InsecureBankv2.apk), and skip otherwise.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

// Under the real home on purpose: that is where ~/.loupe lives, and /Users is denied inside the sandbox.
process.env.LOUPE_HOME = fs.mkdtempSync(path.join(os.homedir(), '.loupe-test-'));
const { startProxy } = await import('./server.js');
const { TOKEN } = await import('./auth.js');
const toolchain = await import('./toolchain.js');
const fixture = (n) => new URL(`./fixtures/${n}`, import.meta.url).pathname;
const { server } = await startProxy({ port: 0, host: '127.0.0.1' });
const base = `http://localhost:${server.address().port}/__loupe/jadx`;
test.after(() => { server.close(); fs.rmSync(process.env.LOUPE_HOME, { recursive: true, force: true }); });

const H = { Authorization: `Bearer ${TOKEN}` };
const get = (p, init = {}) => fetch(base + p, { ...init, headers: { ...H, ...init.headers } });
const getJson = async (p, init) => (await get(p, init)).json();
const post = (p, body, headers = {}) => get(p, { method: 'POST', body, headers });

// ── hand-built zips (the preflight reads only the central directory) ─────────
function zipWith(entries) {
  // Real zip layout: a local record (header + data) per entry, then the central directory pointing at them.
  let off = 0;
  const locals = [], cds = [];
  for (const { name, comp = 10, unc = 10 } of entries) {
    const filler = Buffer.alloc(30 + Buffer.byteLength(name) + (comp <= 1024 * 1024 ? comp : 0));
    const n = Buffer.from(name), h = Buffer.alloc(46);
    h.writeUInt32LE(0x02014b50, 0); h.writeUInt16LE(8, 10); h.writeUInt32LE(comp, 20); h.writeUInt32LE(unc, 24); h.writeUInt16LE(n.length, 28); h.writeUInt32LE(off, 42);
    filler.writeUInt32LE(0x04034b50, 0); filler.writeUInt16LE(n.length, 26); n.copy(filler, 30);
    locals.push(filler); cds.push(Buffer.concat([h, n])); off += filler.length;
  }
  const cd = Buffer.concat(cds), eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

test('upload: still works after the cache dir is wiped while the bridge runs', async () => {
  fs.rmSync(path.join(process.env.LOUPE_HOME, '.tmp'), { recursive: true, force: true });
  const j = await (await post('/upload?name=ok.apk', zipWith([{ name: 'classes.dex', comp: 100, unc: 400 }]))).json();
  assert.ok(j.ok && j.upload, JSON.stringify(j));
});
test('upload: not a zip is refused', async () => assert.equal((await post('/upload?name=a.apk', Buffer.from('hello world, not a zip'))).status, 422));
test('upload: path-traversal entry name is refused', async () =>
  assert.equal((await post('/upload?name=a.apk', zipWith([{ name: '../../evil' }]))).status, 422));
test('upload: highly compressible native libs are fine (a 34 MB .so that deflates to 175 KB is real)', async () => {
  const r = await post('/upload?name=a.apk', zipWith([{ name: 'lib/arm64-v8a/libx.so', comp: 175_000, unc: 34_000_000 }]));
  assert.equal(r.status, 200);
});
test('upload: declared size over the limit is refused', async () =>
  assert.equal((await post('/upload?name=a.apk', zipWith([{ name: 'a', comp: 1e9, unc: 2e9 }, { name: 'b', comp: 1e9, unc: 2e9 }]))).status, 422));
test('upload: a sane zip is accepted', async () => {
  const j = await (await post('/upload?name=ok.apk', zipWith([{ name: 'classes.dex', comp: 100, unc: 400 }]))).json();
  assert.ok(j.ok && j.upload && j.sha256.length === 64);
});

// ── jail + search against a crafted cache (no jadx needed) ───────────────────
const ID = 'a'.repeat(64);
const dir = path.join(process.env.LOUPE_HOME, 'decompiled', ID);
const out = path.join(dir, 'out');
fs.mkdirSync(path.join(out, 'sources/com/acme'), { recursive: true });
fs.mkdirSync(path.join(out, 'resources'), { recursive: true });
fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ id: ID, name: 't.apk', createdAt: 1, bytes: 1 }));
fs.writeFileSync(path.join(out, 'sources/com/acme/Main.java'), 'class Main {\n  String k = "AES/ECB/PKCS5Padding";\n}\n');
fs.writeFileSync(path.join(out, 'resources/blob.bin'), Buffer.from([1, 2, 0, 3]));
fs.writeFileSync(path.join(out, 'resources/AndroidManifest.xml'), '<manifest package="com.acme" android:versionName="1.0"/>');
fs.writeFileSync(path.join(out, 'sources/com/acme/Evil.java'), 'a'.repeat(40) + '!\n');
fs.symlinkSync('/etc/hosts', path.join(out, 'resources/leak'));
fs.symlinkSync('/etc', path.join(out, 'resources/dirleak'));

test('file: reads a real source file', async () => {
  const r = await get(`/file?id=${ID}&path=sources/com/acme/Main.java`);
  assert.equal(r.status, 200); assert.match(await r.text(), /AES\/ECB/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});
test('file: .. is refused', async () => assert.equal((await get(`/file?id=${ID}&path=../../meta.json`)).status, 400));
test('file: absolute path is refused', async () => assert.equal((await get(`/file?id=${ID}&path=/etc/hosts`)).status, 400));
test('file: symlink to a file is refused', async () => assert.equal((await get(`/file?id=${ID}&path=resources/leak`)).status, 403));
test('file: path through a symlinked dir is refused', async () => assert.equal((await get(`/file?id=${ID}&path=resources/dirleak/hosts`)).status, 403));
test('file: binary is shown as a hex dump, never as raw text', async () => {
  const r = await get(`/file?id=${ID}&path=resources/blob.bin`);
  assert.equal(r.status, 200);
  assert.match(await r.text(), /^\/\/ binary file, .*\n00000000  /);
});
test('file: bad id shape is refused', async () => assert.equal((await get(`/file?id=../../etc&path=x`)).status, 400));
test('file: unknown id is 404', async () => assert.equal((await get(`/file?id=${'b'.repeat(64)}&path=x`)).status, 404));
test('raw: unknown types are download-only and sandboxed', async () => {
  const r = await get(`/raw?id=${ID}&path=resources/blob.bin`);
  assert.match(r.headers.get('content-disposition'), /attachment/);
  assert.match(r.headers.get('content-security-policy'), /sandbox/);
});
test('tree: folds single-child packages and hides symlinks', async () => {
  const src = await getJson(`/tree?id=${ID}&dir=sources`);
  assert.deepEqual(src.entries.map((e) => e.n), ['com/acme']);
  const res = await getJson(`/tree?id=${ID}&dir=resources`);
  assert.ok(!res.entries.some((e) => e.n === 'leak' || e.n === 'dirleak'));
});
test('search: finds a string with line and column', async () => {
  const j = await getJson(`/search?id=${ID}&q=${encodeURIComponent('AES/ECB')}&scope=code`);
  assert.equal(j.results.length, 1);
  assert.deepEqual([j.results[0].p, j.results[0].l, j.results[0].c], ['sources/com/acme/Main.java', 2, 14]);
});
test('search: names scope matches paths', async () => assert.equal((await getJson(`/search?id=${ID}&q=main&scope=names`)).results[0].p, 'sources/com/acme/Main.java'));
test('search: a catastrophic regex is cut off and the bridge stays responsive', async () => {
  const t = Date.now();
  const j = await getJson(`/search?id=${ID}&q=${encodeURIComponent('(a+)+$')}&regex=1&scope=code`);
  assert.ok(j.timedOut, 'should time out'); assert.ok(Date.now() - t < 9000);
  assert.equal((await get('/status')).status, 200);
});
test('search: bad regex is reported, not thrown', async () => assert.equal((await getJson(`/search?id=${ID}&q=${encodeURIComponent('(')}&regex=1`)).ok, false));
test('info: reads manifest facts from the output', async () => {
  const j = await getJson(`/info?id=${ID}`);
  assert.equal(j.manifest.package, 'com.acme');
});

test('recent: lists app name, version and icon, and a scan can be deleted', async () => {
  const id = 'c'.repeat(64), d = path.join(path.dirname(dir), id), res = path.join(d, 'out/resources');
  fs.mkdirSync(path.join(res, 'res/mipmap-hdpi'), { recursive: true }); fs.mkdirSync(path.join(res, 'res/mipmap-xxhdpi'), { recursive: true });
  fs.mkdirSync(path.join(res, 'res/values'), { recursive: true });
  fs.writeFileSync(path.join(d, 'meta.json'), JSON.stringify({ id, name: 'x.apk', createdAt: 5, sourceFiles: 3, errors: 0, parts: [{ sha256: 'ab'.repeat(32), size: 2048 }] }));
  fs.writeFileSync(path.join(res, 'AndroidManifest.xml'), '<manifest package="com.x" android:versionName="2.1" android:versionCode="21"><application android:label="@string/app_name" android:icon="@mipmap/ic"/></manifest>');
  fs.writeFileSync(path.join(res, 'res/values/strings.xml'), '<resources><string name="app_name">Xapp</string></resources>');
  fs.writeFileSync(path.join(res, 'res/mipmap-hdpi/ic.png'), 'a'); fs.writeFileSync(path.join(res, 'res/mipmap-xxhdpi/ic.png'), 'b');
  const it = (await getJson('/recent')).items.find((x) => x.id === id);
  assert.deepEqual([it.label, it.package, it.versionName, it.icon, it.apkSize], ['Xapp', 'com.x', '2.1', 'resources/res/mipmap-xxhdpi/ic.png', 2048]);
  assert.equal((await get(`/recent?id=${id}`, { method: 'DELETE' })).status, 200);
  assert.ok(!(await getJson('/recent')).items.some((x) => x.id === id));
});

// ── API basics ───────────────────────────────────────────────────────────────
const APK = [process.env.LOUPE_TEST_APK, new URL('../../loupe-blog/InsecureBankv2.apk', import.meta.url).pathname].find((p) => p && fs.existsSync(p));
const upload = async (file = APK) => (await (await post(`/upload?name=${path.basename(file)}`, fs.readFileSync(file))).json()).upload;
const openJob = async (uploadId, body = {}) => (await post('/open', JSON.stringify({ uploads: [uploadId], ...body }))).json();
const waitDone = async (id) => {
  const r = await get(`/job?id=${id}`); let last;
  for await (const chunk of r.body) for (const m of Buffer.from(chunk).toString().matchAll(/data: (.+)/g)) last = JSON.parse(m[1]);
  return last;
};

test('status: reports the toolchain and platform', async () => {
  const j = await getJson('/status');
  assert.ok(j.ok && j.platform && typeof j.toolchain.supported === 'boolean' && typeof j.toolchain.installed === 'boolean');
});

test('open: refused with a clear code when the toolchain is not installed', async () => {
  if (toolchain.resolve()) return;                                   // installed: covered by the real-jadx tests below
  const up = await upload(fixture('rsa-v1.apk'));
  const r = await post('/open', JSON.stringify({ uploads: [up] }));
  assert.equal(r.status, 424); assert.equal((await r.json()).code, 'no-toolchain');
});

// ── full decompile: failure handling with a stub "java" (POSIX shell; no toolchain needed) ───────────
const posix = process.platform === 'win32' ? { skip: 'POSIX only' } : {};
function stubToolchain(script) {
  const dir = fs.mkdtempSync(path.join(os.homedir(), '.loupe-stub-'));
  fs.mkdirSync(path.join(dir, 'bin'));
  fs.writeFileSync(path.join(dir, 'bin', 'java'), `#!/bin/sh\n${script}\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'jadx.jar'), 'x');
  return dir;
}
const withStub = async (script, body, name) => {
  const dir = stubToolchain(script);
  process.env.LOUPE_JAVA = path.join(dir, 'bin', 'java'); process.env.LOUPE_JADX_JAR = path.join(dir, 'jadx.jar');
  try { return await body(); } finally { delete process.env.LOUPE_JAVA; delete process.env.LOUPE_JADX_JAR; fs.rmSync(dir, { recursive: true, force: true }); }
};
// the stub finds the -d <dir> argument, writes a partial tree, then exits like jadx would
const STUB = (log, code) => `while [ $# -gt 0 ]; do if [ "$1" = "-d" ]; then OUT="$2"; fi; shift; done\n/bin/mkdir -p "$OUT/sources/a" && echo "class B {}" > "$OUT/sources/a/B.java"\n${log}\nexit ${code}`;

test('full: a crashed jadx (exit 2, partial output) is NOT published', posix, async () => {
  await withStub(STUB('echo "Exception in thread main java.lang.OutOfMemoryError" >&2', 2), async () => {
    const up = await upload(fixture('rsa-v1.apk'));
    const j = await openJob(up, {});
    const fin = await waitDone(j.id);
    assert.equal(fin.state, 'error');
    assert.equal(fs.existsSync(path.join(process.env.LOUPE_HOME, 'decompiled', j.id, 'meta.json')), false, 'a partial tree must never get a meta.json');
    assert.equal((await get(`/tree?id=${j.id}&dir=`)).status, 404);
  });
});
test('full: "finished with errors" with exit 0 is published and flagged partial', posix, async () => {
  await withStub(STUB('echo "ERROR - finished with errors, count: 2" >&2', 0), async () => {
    const up = await upload(fixture('rsa-v1.apk'));
    const j = await openJob(up, { options: { deobf: true } });
    const fin = await waitDone(j.id);
    assert.equal(fin.state, 'done', fin.error);
    const meta = JSON.parse(fs.readFileSync(path.join(process.env.LOUPE_HOME, 'decompiled', j.id, 'meta.json')));
    assert.equal(meta.partial, true); assert.equal(meta.errors, 2);
  });
});
test('full: that same log line with exit 1 must NOT be trusted (an APK can print anything)', posix, async () => {
  await withStub(STUB('echo "ERROR - finished with errors, count: 0" >&2', 1), async () => {
    const up = await upload(fixture('tampered-rsa-v1v2v3.apk'));
    const j = await openJob(up, {});
    assert.equal((await waitDone(j.id)).state, 'error');
    assert.equal(fs.existsSync(path.join(process.env.LOUPE_HOME, 'decompiled', j.id, 'meta.json')), false);
  });
});
test('open: a request abandoned before its response is sent does not leave the job running', posix, async () => {
  await withStub('sleep 30', async () => {
    const up = await upload(fixture('rsa-v1.apk'));
    const body = JSON.stringify({ uploads: [up], options: { deobf: true, deobfMax: 99 } });
    await new Promise((resolve) => {                         // POST /open, then drop the connection without reading the reply
      const r = http.request(`${base}/open`, { method: 'POST', headers: { ...H, 'Content-Length': Buffer.byteLength(body) } });
      r.on('error', () => {}); r.on('close', resolve);
      r.end(body, () => r.destroy());
    });
    await new Promise((r) => setTimeout(r, 300));
    const again = await openJob(up, { options: { deobf: true, deobfMax: 99 } });         // same key
    const out = await (await get(`/job?id=${again.id}`, { method: 'DELETE' })).json();
    assert.equal(out.state, 'cancelling');                   // refs went 1 -> 0 here, so the abandoned request held nothing
  });
});
test('full: JVM limits and home reach the tool inside the sandbox', posix, async () => {
  const script = 'while [ $# -gt 0 ]; do case "$1" in -d) OUT="$2";; esac; ALL="$ALL $1"; shift; done\n'
    + '/bin/mkdir -p "$OUT/resources" "$OUT/sources" && echo "HOME=$HOME ARGS=$ALL" > "$OUT/resources/seen.txt"\nexit 0';
  await withStub(script, async () => {
    const up = await upload(fixture('rsa-v1.apk'));
    const j = await openJob(up, { options: { deobfMin: 5 } });
    const fin = await waitDone(j.id);
    assert.equal(fin.state, 'done', fin.error);
    const seen = await (await get(`/file?id=${j.id}&path=resources/seen.txt`)).text();
    assert.match(seen, /HOME=\S*\/home\b/); assert.match(seen, /-Xmx\d+m/); assert.match(seen, /-Djava\.io\.tmpdir=/); assert.match(seen, /-Duser\.home=/);
  });
});
test('full: a clean exit 0 is published', posix, async () => {
  await withStub(STUB('', 0), async () => {
    const up = await upload(fixture('rsa-v1v2v3.apk'));
    const fin = await waitDone((await openJob(up, {})).id);
    assert.equal(fin.state, 'done', fin.error);
  });
});

// ── the real thing ───────────────────────────────────────────────────────────
if (process.env.LOUPE_TEST_INSTALL) await toolchain.install();
const real = APK && toolchain.resolve() ? {} : { skip: 'needs the managed toolchain (LOUPE_TOOLS or LOUPE_TEST_INSTALL=1) and a sample APK' };
test('jadx: decompile, single-flight, browse, search, signature', real, async (t) => {
  const up = await upload();
  const a = await openJob(up), b = await openJob(up);               // a retry while running must join, not start a second job
  assert.equal(a.id, b.id);
  assert.equal((await getJson(`/job?id=${a.id}`, { method: 'DELETE' })).refs, 1);   // one holder cancelled; the other still needs it
  const fin = await waitDone(a.id);
  assert.equal(fin.state, 'done', fin.error);
  await t.test('re-open is an instant cache hit', async () => assert.equal((await openJob(up)).state, 'done'));
  await t.test('real source with method bodies', async () => assert.match(await (await get(`/file?id=${a.id}&path=sources/com/android/insecurebankv2/CryptoClass.java`)).text(), /Cipher\.getInstance\("AES\/CBC\/PKCS5Padding"\)/));
  await t.test('manifest and resources are decoded', async () => {
    assert.match(await (await get(`/file?id=${a.id}&path=resources/AndroidManifest.xml`)).text(), /package="com\.android\.insecurebankv2"/);
    assert.equal(((await (await get(`/file?id=${a.id}&path=resources/res/values/strings.xml`)).text()).match(/<string /g) || []).length, 95);
  });
  await t.test('search code', async () => assert.ok((await getJson(`/search?id=${a.id}&q=Cipher&scope=code`)).results.length > 0));
  await t.test('info: manifest facts and a real signature verdict', async () => {
    const j = await getJson(`/info?id=${a.id}`);
    assert.equal(j.manifest.package, 'com.android.insecurebankv2'); assert.equal(j.manifest.debuggable, 'true');
    assert.equal(j.signature.schemes.v1.verified, true);
    assert.equal(j.signature.signers[0].sha256, '8092db81ae717486631a1534977def465ee112903e1553d38d41df8abd57a375');
  });
  await t.test('not flagged partial', async () => assert.equal(JSON.parse(fs.readFileSync(path.join(process.env.LOUPE_HOME, 'decompiled', a.id, 'meta.json'))).partial, false));
});
test('jadx: cancelling the last holder kills the job', real, async () => {
  const up = await upload();
  const j = await openJob(up, { options: { deobf: true, deobfMin: 5 } });      // different options, different cache key
  const c = await getJson(`/job?id=${j.id}`, { method: 'DELETE' });
  assert.ok(['cancelling', 'cancelled'].includes(c.state));
  assert.equal((await waitDone(j.id)).state, 'cancelled');
});
