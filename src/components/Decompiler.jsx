import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useLoupe } from '../store.jsx';
import * as webadb from '../lib/webadb.js';
import * as jx from '../lib/jadx.js';
import { AppSelect, Mini, Split, Tab, useDismiss } from './ui.jsx';
import { CodePane } from './CodePane.jsx';
import { SearchPanel, InfoView, Tree, RecentScans, AppIcon } from './JxPanels.jsx';

const OPTS_KEY = 'loupe.jx.opts';
const DEFAULTS = { deobf: false, deobfMin: 3, deobfMax: 64, useSourceName: false, showBadCode: true };
const loadOpts = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(OPTS_KEY)) }; } catch { return DEFAULTS; } };
const IMG = /\.(png|jpe?g|gif|webp)$/i;
const langOf = (p) => (p.endsWith('.java') ? 'java' : p.endsWith('.xml') ? 'xml' : 'text');

/** First-run setup: Java and jadx are downloaded once, only after a click, then decompiling continues by itself. */
function SetupCard({ tc, pendingName, onInstall }) {
  const pct = tc.progress?.total ? Math.round((tc.progress.done / tc.progress.total) * 100) : 0;
  if (!tc.supported) return <div className="jx-setup" style={{ color: 'var(--warn)' }}>Decompiling is not available on this machine: {tc.reason}.</div>;
  return (
    <div className="jx-setup">
      Decompiling needs Java and jadx. Loupe downloads them once into <span className="mono">~/.loupe/tools</span> (about {tc.sizeMB} MB,
      checksum-pinned, nothing installed system-wide){pendingName ? <>, then decompiles <b>{pendingName}</b> automatically</> : null}.{' '}
      {tc.installing
        ? <span className="mono" style={{ fontSize: 11.5 }}>{tc.progress?.phase || 'starting'}{pct ? ` ${pct}%` : '…'}</span>
        : <Mini tone="accent" label={`Download ${tc.sizeMB} MB${pendingName ? ' and decompile' : ''}`} onClick={onInstall} />}
      {tc.error && <div style={{ color: 'var(--err)' }}>Download failed: {tc.error}</div>}
    </div>
  );
}

export default function Decompiler() {
  const { s, set, toast } = useLoupe();
  const active = s.view === 'decompiler';

  const [tool, setTool] = useState(null);                 // bridge status: platform + toolchain (Java and jadx download)
  const [pending, setPending] = useState(null);           // files waiting for the one-time toolchain download
  const [proj, setProj] = useState(null);                 // { id, name }
  const [job, setJob] = useState(null);                   // upload / decompile progress
  const [info, setInfo] = useState(null);
  const [recent, setRecent] = useState([]);
  const [batch, setBatch] = useState(null);                 // { i, n } while several apps are decompiled in turn
  const [opts, setOpts] = useState(loadOpts);
  const [optsOpen, setOptsOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const optsRef = useDismiss(optsOpen, () => setOptsOpen(false));
  const [paneTab, setPaneTab] = useState('sources');      // sources | resources | info
  const [treeFilter, setTreeFilter] = useState('');
  const [tabs, setTabs] = useState([]);
  const [cur, setCur] = useState(null);
  const [hit, setHit] = useState(null);
  const [term, setTerm] = useState(null);
  const [bottom, setBottom] = useState({ open: false, tab: 'search' });
  const [focusKey, setFocusKey] = useState(0);
  const [, bump] = useReducer((n) => n + 1, 0);
  const projId = useRef(null);                            // the project on screen; late responses for any other are dropped
  const docs = useRef(new Map());                         // path -> { text | url | err }
  const lastFiles = useRef(null);
  const ctl = useRef(null);
  const picker = useRef(null);

  const refresh = useCallback(() => {
    jx.status().then(setTool).catch((e) => setTool({ error: e.message }));
    jx.recent().then(setRecent).catch(() => {});
  }, []);
  useEffect(() => { if (active) refresh(); }, [active, refresh]);
  const tc = tool?.toolchain;
  useEffect(() => {                                       // poll while it downloads
    if (!tc?.installing) return undefined;
    const t = setInterval(() => jx.status().then(setTool).catch(() => {}), 700);
    return () => clearInterval(t);
  }, [tc?.installing]);
  const deleteScan = (r) => jx.forget(r.id).then(() => setRecent((x) => x.filter((y) => y.id !== r.id))).catch((e) => toast(e.message));
  const installTools = () => jx.installToolchain().then(setTool).catch((e) => toast(e.message));
  useEffect(() => { if (pending && tc?.installed) { const f = pending; setPending(null); run(f); } }, [tc?.installed, pending]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { localStorage.setItem(OPTS_KEY, JSON.stringify(opts)); } catch { /* private mode */ } }, [opts]);

  // ── opening ───────────────────────────────────────────────────────────────
  const closeProject = () => { projId.current = null; docs.current.clear(); setProj(null); };
  const loadProject = useCallback(async (id, name) => {
    docs.current.clear(); projId.current = id;
    setProj({ id, name }); setTabs([]); setCur(null); setHit(null); setTerm(null); setInfo(null);
    setPaneTab('sources'); setTreeFilter(''); setBottom({ open: false, tab: 'search' });
    const mine = (f) => (x) => { if (projId.current === id) f(x); };
    jx.info(id).then(mine(setInfo)).catch(mine((e) => setInfo({ meta: { sourceFiles: 0, tool: '?', warnings: 0, errors: 0 }, manifest: {}, signature: { error: e.message } })));
    jx.recent().then(setRecent).catch(() => {});
  }, []);

  /** One cancel signal covers pulling, uploading, opening and watching. */
  const begin = () => { ctl.current?.abort(); ctl.current = new AbortController(); return ctl.current.signal; };

  /** Decompiles one app (its base APK plus any splits). Returns true when it finished; `open` shows it afterwards. */
  const runOne = async (files, signal, open) => {
    setJob({ state: 'uploading', msg: 'uploading…', pct: 0 });
    try {
      const ups = [];
      for (const f of files) ups.push((await jx.upload(f.blob, f.name, f.role, signal)).upload);
      const j = await jx.open(ups, opts, signal);
      if (signal.aborted) { jx.cancel(j.id).catch(() => {}); return false; }   // cancelled while /open was in flight
      setJob(j);
      const fin = j.state === 'done' ? j : await jx.watch(j.id, setJob, signal);
      if (signal.aborted) return false;
      if (fin?.state !== 'done') { setJob(fin); return false; }
      setJob(null);
      if (open) await loadProject(j.id, files[0].name);
      return true;
    } catch (e) {
      if (e.code === 'no-toolchain') { setJob(null); refresh(); throw e; }
      if (e.name !== 'AbortError') setJob({ state: 'error', error: e.message });
      return false;
    }
  };

  /** `files` is one app; an array marked `.batch` is several separate apps, decompiled one after another. */
  const run = useCallback(async (files, sig = null) => {
    lastFiles.current = files;
    if (tc && !tc.supported) { setJob({ state: 'error', error: `Decompiling is not available on this machine: ${tc.reason}.` }); return; }
    if (tc && !tc.installed) { setPending(files); return; }          // ask first, then continue by itself
    const signal = sig || begin();
    try {
      if (!files.batch) { await runOne(files, signal, true); return; }
      let done = 0;
      for (const f of files) {
        setBatch({ i: done + 1, n: files.length });
        if (!(await runOne([f], signal, false))) break;
        done++;
      }
      setBatch(null);
      if (signal.aborted) return;
      jx.recent().then(setRecent).catch(() => {});
      if (done === files.length) { closeProject(); toast(`Decompiled ${done} apps`); }
    } catch (e) {
      setBatch(null);
      if (e.code === 'no-toolchain') setPending(files); else throw e;
    }
  }, [tc, opts, loadProject, refresh]);

  const fromFiles = (list) => {
    const apks = [...list].filter((f) => /\.apk$/i.test(f.name));
    if (!apks.length) { toast('Pick an .apk file'); return; }
    // One app with splits, or several apps? Splits look like split_*, config.* or base-*; with at most one other file it is
    // a single app (its base is base.apk, else the biggest non-split file). Anything else is a batch of separate apps.
    const isSplit = (f) => /^(split_|config\.|base-)/i.test(f.name);
    const named = apks.filter((f) => /^base(-master)?\.apk$/i.test(f.name));
    const loose = apks.filter((f) => !isSplit(f));
    if (apks.length > 1 && (named.length > 1 || (!named.length && loose.length > 1))) {
      const many = apks.map((f) => ({ blob: f, name: f.name, role: 'base' }));
      many.batch = true;
      run(many);
      return;
    }
    const base = apks.length === 1 ? apks[0] : named.length === 1 ? named[0] : loose.length === 1 ? loose[0] : apks[0];
    run(apks.map((f) => ({ blob: f, name: f.name, role: f === base ? 'base' : 'split' })));
  };

  const fromDevicePaths = async (paths, label) => {
    setJob({ state: 'uploading', msg: `pulling ${label} from the device…`, pct: 0 });
    const signal = begin();
    try {
      const files = [];
      for (const p of paths) {
        if (signal.aborted) return;
        const { bytes } = await webadb.readAny(p, 1024 ** 3);
        const n = p.split('/').pop();
        files.push({ blob: new Blob([bytes]), name: paths.length > 1 && n !== 'base.apk' ? n : (paths.length > 1 ? `${label}.apk` : n === 'base.apk' ? `${label}.apk` : n), role: n === 'base.apk' || paths.length === 1 ? 'base' : 'split' });
      }
      if (signal.aborted) return;
      await run(files, signal);
    } catch (e) { setJob({ state: 'error', error: `could not pull: ${e.message}` }); }
  };

  const fromPackage = async (pkg) => {
    if (!/^[A-Za-z0-9_.]+$/.test(pkg)) { toast('Unexpected package name'); return; }
    const out = await webadb.run(`pm path ${pkg}`).catch(() => '');
    const paths = out.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('package:')).map((l) => l.slice(8));
    if (!paths.length) { toast(`No APK found for ${pkg}`); return; }
    await fromDevicePaths(paths, pkg);
  };

  // Entry points elsewhere in Loupe (Apps, Files, drag-and-drop) leave a request in the store.
  useEffect(() => {
    const r = s.jxRequest;
    if (!r) return;
    set({ jxRequest: null });
    if (r.kind === 'files') fromFiles(r.files);
    else if (r.kind === 'package') fromPackage(r.pkg);
    else if (r.kind === 'path') fromDevicePaths([r.path], r.path.split('/').pop().replace(/\.apk$/i, ''));
  }, [s.jxRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = () => { if (job?.id) jx.cancel(job.id).catch(() => {}); ctl.current?.abort(); setJob(null); };

  // ── documents ─────────────────────────────────────────────────────────────
  const openPath = useCallback(async (path, h = null) => {
    if (!proj) return;
    setCur(path); setHit(h ? { ...h, seq: Date.now() } : null);
    setTabs((t) => (t.includes(path) ? t : [...t, path]));
    if (docs.current.has(path)) return;
    const id = proj.id, put = (d) => { if (projId.current === id) docs.current.set(path, d); };   // a late reply for another project is dropped
    put({ loading: true }); bump();
    try { put({ text: await jx.file(id, path) }); }
    catch (e) {
      if (e.code === 'binary' && IMG.test(path)) put({ url: await jx.rawUrl(id, path).catch(() => null), err: null });
      else put({ err: e.code === 'binary' ? 'Binary file, no preview.' : e.message });
    }
    bump();
  }, [proj]);

  const closeTab = (p) => {
    const rest = tabs.filter((x) => x !== p);
    setTabs(rest);
    if (cur === p) setCur(rest.at(-1) || null);
  };

  const openSearch = (tab = 'search') => { setBottom({ open: true, tab }); if (tab === 'search') setFocusKey((k) => k + 1); };

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === 'f' && proj) { e.preventDefault(); openSearch('search'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, proj]);

  // ── render ────────────────────────────────────────────────────────────────
  const busy = job && (job.state === 'uploading' || job.state === 'queued' || job.state === 'running');
  const doc = cur ? docs.current.get(cur) : null;

  const here = proj ? recent.find((r) => r.id === proj.id) : null;
  const Toolbar = (
    <div className="ctxbar" style={{ gap: 8 }}>
      <input ref={picker} type="file" accept=".apk" multiple hidden onChange={(e) => { fromFiles(e.target.files); e.target.value = ''; }} />
      {proj ? <>
        <button className="btn" title="Back to the upload box and recent scans" onClick={() => { jx.recent().then(setRecent).catch(() => {}); closeProject(); }}>
          <span aria-hidden="true">‹</span> Scans
        </button>
        {here && <AppIcon id={here.id} path={here.icon} size={22} />}
        <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }} title={proj.name}>{here?.label || proj.name}</span>
        {info?.manifest?.package && <span className="mono subtle hide-narrow" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {info.manifest.package}{info.manifest.versionName ? ` · ${info.manifest.versionName}` : ''}</span>}
      </> : <span style={{ fontWeight: 600, fontSize: 14 }}>Decompiler</span>}
      {busy && (
        <span className="mono" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--ink2)' }}>
          <span style={{ width: 120, height: 5, borderRadius: 3, background: 'var(--bg4)', overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${job.pct || 5}%`, background: 'var(--accentFill)' }} />
          </span>
          {batch ? `(${batch.i}/${batch.n}) ` : ''}{job.msg}
          <Mini label="Cancel" onClick={cancel} />
        </span>
      )}
      <div className="spacer" />
      {s.connected && (
        <AppSelect apps={s.apps} appIcons={s.appIcons} value="" placeholder="Pull from device" open={devOpen}
          onToggle={setDevOpen} onPick={(pkg) => pkg && fromPackage(pkg)} />
      )}
      <span ref={optsRef} style={{ display: 'contents' }}>
        <Mini tone={opts.deobf ? 'accent' : undefined} label={opts.deobf ? 'Deobf: on ⚙' : 'Deobf: off ⚙'} onClick={() => setOptsOpen((o) => !o)} />
        {optsOpen && (
          <div className="menu" style={{ top: 'calc(100% + 4px)', left: 'auto', right: 8, width: 300, padding: 12, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12.5 }}>
            <label className="jx-opt"><input type="checkbox" checked={opts.deobf} onChange={(e) => setOpts({ ...opts, deobf: e.target.checked })} /><span>Deobfuscate names</span></label>
            <div className="jx-range" style={{ opacity: opts.deobf ? 1 : 0.45 }}>
              <div className="jx-hint">Rename names whose length is</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <label><span>shorter than</span><input type="number" min="1" max="20" disabled={!opts.deobf} value={opts.deobfMin} onChange={(e) => setOpts({ ...opts, deobfMin: +e.target.value || 3 })} /></label>
                <label><span>longer than</span><input type="number" min="8" max="255" disabled={!opts.deobf} value={opts.deobfMax} onChange={(e) => setOpts({ ...opts, deobfMax: +e.target.value || 64 })} /></label>
              </div>
            </div>
            <label className="jx-opt" style={{ opacity: opts.deobf ? 1 : 0.45 }}><input type="checkbox" disabled={!opts.deobf} checked={opts.useSourceName} onChange={(e) => setOpts({ ...opts, useSourceName: e.target.checked })} /><span>Use source file names for classes</span></label>
            <label className="jx-opt"><input type="checkbox" checked={opts.showBadCode} onChange={(e) => setOpts({ ...opts, showBadCode: e.target.checked })} /><span>Show inconsistent code instead of hiding it</span></label>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>Changing these decompiles again into a separate cache entry.</div>
            {lastFiles.current && <Mini tone="accent" label="Apply and decompile again" disabled={busy} onClick={() => { setOptsOpen(false); run(lastFiles.current); }} />}
          </div>
        )}
      </span>
      {proj && <Mini label="Search ⇧⌘F" onClick={() => openSearch('search')} />}
    </div>
  );

  const Empty = (
    <div style={{ flex: '1 1 auto', overflow: 'auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="jx-hero">
        <h2>Decompile and inspect an Android app</h2>
        <p>Open an APK from disk, drop one anywhere in this window, or pull an installed app from the connected phone. You get decompiled Java, the decoded manifest and resources, search over everything, and signature checks.</p>
      </div>
      <div className="jx-zone">
        <button className="jx-drop" disabled={busy} onClick={() => picker.current?.click()}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></svg>
          <span>Drag and drop APKs here, or click to browse</span>
        </button>
        {tool?.error && <div className="mono" style={{ color: 'var(--err)', textAlign: 'center' }}>Bridge unavailable: {tool.error}</div>}
        {tc && !tc.installed && <SetupCard tc={tc} pendingName={pending?.[0]?.name} onInstall={installTools} />}
        {job?.state === 'error' && <pre className="mono" style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--err)', fontSize: 11 }}>{job.error}</pre>}
      </div>
      {recent.length > 0 && (
        <div style={{ width: 'min(1320px,100%)', margin: '0 auto' }}>
          <RecentScans items={recent} onOpen={(r) => loadProject(r.id, r.name)} onDelete={deleteScan} onCopied={(what) => toast(`${what.replace(/^./, (c) => c.toUpperCase())} copied`)} />
        </div>)}
    </div>
  );

  const Editor = (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
      <div className="jx-doctabs">
        {tabs.map((p) => (
          <div key={p} className={'jx-doctab mono' + (cur === p ? ' on' : '')} onClick={() => setCur(p)} title={p}
            onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
            onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); closeTab(p); } }}>
            {p.split('/').pop()}
            <span className="tab-x" role="button" aria-label={`Close ${p.split('/').pop()}`} onClick={(e) => { e.stopPropagation(); closeTab(p); }}>×</span>
          </div>))}
      </div>
      {cur && (
        <div className="jx-crumb mono">
          <span title={cur}>{cur.split('/').join('  ›  ')}</span>
          <button className="btn-quiet" style={{ padding: '1px 6px' }} title="Copy this path" aria-label="Copy path"
            onClick={() => navigator.clipboard?.writeText(cur).then(() => toast('Path copied'), () => {})}>Copy</button>
        </div>)}
      <div style={{ flex: '1 1 auto', minHeight: 0, position: 'relative', background: 'var(--bg2)' }}>
        {!cur && <div className="mono preview-note">Pick a file in the tree.</div>}
        {doc?.loading && <div className="mono preview-note">Reading…</div>}
        {doc?.err && <div className="mono preview-note">{doc.err}</div>}
        {doc?.url && <div style={{ position: 'absolute', inset: 12 }}><img src={doc.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>}
        {doc?.text !== undefined && <CodePane text={doc.text} lang={langOf(cur)} hit={hit?.l ? hit : null} term={term} />}
      </div>
    </div>
  );

  const Left = proj && (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, background: 'var(--bg2)' }}>
      <div className="jx-seg" role="tablist" aria-label="Sidebar">
        {[['sources', 'Source', 'M5 4L1.5 8L5 12M11 4L14.5 8L11 12'], ['resources', 'Resources', 'M2 3.5h12v9H2z M2 10l3.5-3.5L9 10l2-2 3 3'], ['info', 'Info', 'M8 7v4.5M8 4.6v.1 M8 1.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13z']].map(([k, l, d]) => (
          <button key={k} role="tab" aria-selected={paneTab === k} className={paneTab === k ? 'on' : ''} onClick={() => setPaneTab(k)}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>{l}
          </button>))}
      </div>
      {paneTab !== 'info' && <div className="field jx-filter"><input value={treeFilter} onChange={(e) => setTreeFilter(e.target.value)} placeholder="Filter tree" aria-label="Filter tree" /></div>}
      {paneTab === 'info' ? <InfoView info={info} /> : <Tree id={proj.id} root={paneTab} selected={cur} onOpen={openPath} filter={treeFilter} />}
    </div>
  );

  const Bottom = proj && (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg2)' }}>
      <div style={{ display: 'flex', gap: 4, padding: 6, borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
        <Tab on={bottom.tab === 'search'} label="Search" onClick={() => openSearch('search')} />
        <div className="spacer" />
        <button className="btn-quiet" onClick={() => setBottom({ ...bottom, open: false })} title="Close panel">×</button>
      </div>
      <SearchPanel id={proj.id} focusKey={focusKey} onOpen={openPath} onTerm={setTerm} />
    </div>
  );

  const Main = proj && (
    <Split id="jx-tree" initial={0.22} min={0.1}>
      {Left}
      {bottom.open ? <Split id="jx-bottom" dir="y" initial={0.62} min={0.2}>{Editor}{Bottom}</Split> : Editor}
    </Split>
  );

  return (
    <div style={{ display: active ? 'flex' : 'none', flexDirection: 'column', minHeight: 0, minWidth: 0, position: 'relative', background: 'var(--bg)' }}>
      {Toolbar}
      {proj ? Main : Empty}
      <div className="panel-foot" style={{ gap: 14 }}>
        <span>{info?.meta?.tool || (tc?.installed ? `jadx ${tc.version} ready` : 'jadx not set up')}</span>
        {proj && info?.meta && <span>{info.meta.sourceFiles} source files</span>}
        {proj && info?.meta && <span style={{ color: info.meta.errors ? 'var(--err)' : undefined }}>{info.meta.errors} errors · {info.meta.warnings} warnings</span>}
        <div className="spacer" />
        {tc?.sandbox && <span>sandbox: {tc.sandbox}</span>}
      </div>
    </div>
  );
}
