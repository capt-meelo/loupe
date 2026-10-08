// Run: npm test. Proves the sandbox really confines (not just that it spawns).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { wrap, sandboxKind } from './sandbox.js';

const opts = sandboxKind() ? {} : { skip: 'no sandbox on this platform' };
// Under the real home on purpose: that is where ~/.loupe lives and where /Users is denied.
const work = fs.mkdtempSync(path.join(os.homedir(), '.loupe-sbx-test-'));
const [ro, rw, secretDir] = ['ro', 'rw', 'secret'].map((n) => { const d = path.join(work, n); fs.mkdirSync(d); return d; });
fs.writeFileSync(path.join(ro, 'in.txt'), 'input'); fs.writeFileSync(path.join(secretDir, 's.txt'), 'secret');
test.after(() => fs.rmSync(work, { recursive: true, force: true }));

const run = (script) => {
  const w = wrap('/bin/sh', ['-c', script], { ro: [ro], rw: [rw], profileDir: work });
  return spawnSync(w.cmd, w.args, { cwd: rw, encoding: 'utf8', timeout: 15000 }).status;
};

test('can read granted ro dir', opts, () => assert.equal(run(`cat ${ro}/in.txt`), 0));
test('can write granted rw dir', opts, () => assert.equal(run(`echo x > ${rw}/o.txt`), 0));
test('cannot write the ro dir', opts, () => assert.notEqual(run(`echo x > ${ro}/o.txt`), 0));
test('cannot read other files under the home dir', opts, () => assert.notEqual(run(`cat ${secretDir}/s.txt`), 0));
test('cannot write other places under the home dir', opts, () => assert.notEqual(run(`echo x > ${secretDir}/new.txt`), 0));
test('has no network', opts, () => assert.notEqual(run('/usr/bin/curl -s -m 4 https://example.com -o /dev/null'), 0));
test('the launcher is an absolute path (children run with a scrubbed PATH)', opts, () => {
  const w = wrap('/bin/sh', [], { ro: [ro], rw: [rw], profileDir: work });
  assert.ok(path.isAbsolute(w.cmd), w.cmd);
});
test('refuses paths that would need escaping', opts, () =>
  assert.throws(() => wrap('/bin/sh', [], { ro: ['/tmp/a"b'], rw: [], profileDir: work }), /escaping/));
test('can create nested dirs deep in a granted path (tools stat each ancestor)', opts, () => assert.equal(run(`/bin/mkdir -p ${rw}/a/b/c/x/y/z && cd ${rw}/a/b/c && /bin/ls x/y > /dev/null`), 0));
