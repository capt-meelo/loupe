/**
 * Builds proxy/agent/bridge-prelude.js, a self-contained snippet that restores
 * the global `Java` object.
 *
 * Frida 17 removed the Java/ObjC language bridges from the agent runtime, so
 * off-the-shelf scripts that call `Java.perform(...)` now throw
 * `ReferenceError: 'Java' is not defined`. frida-compile bundles the
 * frida-java-bridge module (it resolves Frida's own runtime imports, which plain
 * esbuild cannot); esbuild then minifies the result. proxy/frida.js prepends the
 * output to any script that uses the `Java` global without importing the bridge.
 *
 *   node scripts/build-frida-bridge.mjs
 *
 * Re-run after bumping frida-java-bridge.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(root, 'proxy', 'agent', 'bridge-entry.js'); // must live in the project root
const out = join(root, 'proxy', 'agent', 'bridge-prelude.js');
const bundle = join(mkdtempSync(join(tmpdir(), 'loupe-bridge-')), 'bundle.js');

execFileSync('node', [join(root, 'node_modules/frida-compile/dist/cli.js'), entry, '-o', bundle], {
  cwd: root, stdio: 'inherit'
});

// frida-compile prefixes a `📦 … ✄` banner into the -o file; drop it.
let src = readFileSync(bundle, 'utf8');
const scissors = src.indexOf('✄');
if (scissors >= 0) src = src.slice(src.indexOf('\n', scissors) + 1);

const { code } = await esbuild.transform(src, { minify: true, legalComments: 'none' });
writeFileSync(out, code);
console.log(`wrote ${out} (${code.length} bytes)`);
