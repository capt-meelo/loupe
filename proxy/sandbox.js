/**
 * OS-level confinement for tools that parse hostile files (jadx).
 *
 * Env scrubbing is hygiene, not a boundary: a parser bug could still read ~/.ssh
 * or phone home. So the child runs with no network, reads only what it is given
 * (plus the OS runtime), and writes only the dirs it is given.
 *   macOS:   sandbox-exec: file reads are denied by default and only the grants (plus the
 *            root directory and /System) are allowed; network and writes are denied.
 *   Linux:   bubblewrap with a deny-by-default filesystem (only runtime dirs + grants).
 *   Windows: no mechanism, so the decompiler is unavailable there.
 * `selfTest` proves the sandbox actually confines on THIS machine before it is trusted
 * (bwrap can exist yet be blocked by user-namespace policy).
 */
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SAFE = /^[^"\\\n\r\0]+$/;                 // would break out of an SBPL string
const real = (p) => { try { return fs.realpathSync(p); } catch { return p; } };   // seatbelt matches real paths (/var -> /private/var)
/** Absolute path of `bin` on PATH, or null. Children are spawned with a scrubbed PATH, so launchers must be absolute. */
const which = (bin) => { for (const d of (process.env.PATH || '').split(path.delimiter)) { const p = d && path.join(d, bin); if (p && fs.existsSync(p)) return p; } return null; };

export function sandboxKind() {
  if (process.platform === 'darwin' && fs.existsSync('/usr/bin/sandbox-exec')) return 'sandbox-exec';
  if (process.platform === 'linux' && which('bwrap')) return 'bwrap';
  return null;
}

/** Wraps `cmd args` so it can read `ro`, write `rw`, and nothing else sensitive. Returns { cmd, args }. */
export function wrap(cmd, args, { ro: ro0 = [], rw: rw0 = [], profileDir, env = {} }) {
  const [ro, rw] = [ro0.map(real), rw0.map(real)];
  const kind = sandboxKind();
  if (!kind) throw new Error('no sandbox available on this platform');
  if (![...ro, ...rw, cmd].every((p) => SAFE.test(p))) throw new Error('refusing a path that needs escaping');

  if (kind === 'sandbox-exec') {
    const rules = [
      '(version 1)', '(allow default)', '(deny network*)',
      '(deny file-write*)',
      '(allow file-write* (literal "/dev/null") (literal "/dev/dtracehelper") (regex #"^/dev/tty") (subpath "/dev/fd"))',
      // Reads are denied by default. The JVM starts with just the root directory, /System and /dev/urandom
      // (found by bisecting `java -version`); stat() stays open (names and sizes, never contents).
      '(deny file-read-data)',
      '(allow file-read-data (literal "/") (subpath "/System") (literal "/dev/urandom") (literal "/dev/random"))',
      ...[...ro, real(cmd)].map((p) => `(allow file-read-data (subpath "${p}"))`),
      ...rw.map((p) => `(allow file-read-data file-write* (subpath "${p}"))`)
    ].join('\n');
    const profile = path.join(profileDir, 'sandbox.sb');
    fs.writeFileSync(profile, rules);
    return { cmd: '/usr/bin/sandbox-exec', args: ['-f', profile, cmd, ...args] };    // env travels through spawn's env
  }

  // bwrap: nothing is visible unless bound. Host runtime dirs read-only, then the grants.
  const sys = ['/usr', '/lib', '/lib64', '/lib32', '/bin', '/sbin'];
  const etc = ['/etc/ld.so.cache', '/etc/ld.so.conf', '/etc/ld.so.conf.d', '/etc/passwd', '/etc/nsswitch.conf', '/etc/localtime'];
  return {
    cmd: which('bwrap'),
    args: ['--unshare-all', '--die-with-parent', '--new-session', '--clearenv',
      ...sys.flatMap((p) => ['--ro-bind-try', p, p]), ...etc.flatMap((p) => ['--ro-bind-try', p, p]),
      ...Object.entries(env).flatMap(([k, v]) => ['--setenv', k, v]),            // --clearenv drops spawn's env, so restore explicitly
      '--proc', '/proc', '--dev', '/dev', '--tmpfs', '/tmp',
      ...ro.flatMap((p) => ['--ro-bind', p, p]), ...rw.flatMap((p) => ['--bind', p, p]),
      '--chdir', rw[0] || '/', cmd, ...args]
  };
}

let verdict = null;
/** Runs Node inside the sandbox and checks it cannot read a canary or reach the network. Cached. */
export async function selfTest(workDir) {
  if (verdict) return verdict;
  const kind = sandboxKind();
  if (!kind) return (verdict = { ok: false, reason: process.platform === 'linux' ? 'bubblewrap (bwrap) is not installed' : `no OS sandbox on ${process.platform}` });

  const dir = fs.mkdtempSync(path.join(workDir || os.tmpdir(), 'sbxprobe-'));
  const probe = path.join(dir, 'run');
  // Canaries in two places no rule mentions: next to the work dir, and in a world-writable system dir.
  const canaries = [path.join(dir, 'canary.txt')];
  const sys = fs.mkdtempSync(path.join(process.platform === 'darwin' ? '/private/var/tmp' : '/var/tmp', 'loupe-canary-'));
  canaries.push(path.join(sys, 'canary.txt'));
  for (const c of canaries) fs.writeFileSync(c, 'secret');
  fs.mkdirSync(probe);
  const server = net.createServer((s) => s.destroy());
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const script = `
    const fs=require('fs'),net=require('net');const out={};
    try{fs.writeFileSync(process.argv[1]+'/w','x');out.write=true}catch{out.write=false}
    out.canary=false;for(const c of process.argv[2].split('|')){try{fs.readFileSync(c);out.canary=true}catch{}}
    const s=net.connect({host:'127.0.0.1',port:+process.argv[3]});
    s.on('connect',()=>{out.net=true;s.destroy();done()});s.on('error',()=>{out.net=false;done()});
    function done(){console.log(JSON.stringify(out));process.exit(0)}setTimeout(done,3000);`;
  try {
    const w = wrap(process.execPath, ['-e', script, probe, canaries.join('|'), String(server.address().port)], { ro: [path.dirname(process.execPath)], rw: [probe], profileDir: dir });
    const r = spawnSync(w.cmd, w.args, { encoding: 'utf8', timeout: 15000, env: { PATH: '/usr/bin:/bin' } });
    const out = JSON.parse((r.stdout || '').trim().split('\n').pop() || '{}');
    verdict = out.write === true && out.canary === false && out.net === false
      ? { ok: true, kind }
      : { ok: false, reason: r.status ? `the ${kind} sandbox failed to start here (${(r.stderr || '').split('\n')[0].slice(0, 120)})` : `the ${kind} sandbox does not confine (${JSON.stringify(out)})` };
  } catch (e) { verdict = { ok: false, reason: e.message }; }
  server.close(); fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(sys, { recursive: true, force: true });
  return verdict;
}
