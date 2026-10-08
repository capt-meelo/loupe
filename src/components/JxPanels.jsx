import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as jx from '../lib/jadx.js';
import { Chip, Mini } from './ui.jsx';

const SCOPES = [['all', 'All'], ['code', 'Code'], ['res', 'Resources'], ['names', 'Names']];
const SEV = { high: 'var(--err)', med: 'var(--warn)', low: 'var(--ink2)', info: 'var(--ink3)' };

/** A match line with the hit highlighted: t is the preview, o/n the hit inside it. */
const Preview = ({ m }) => (
  <span className="mono" style={{ whiteSpace: 'pre', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--ink2)' }}>
    {m.t.slice(0, m.o)}<mark style={{ background: 'var(--accentFill)', color: 'var(--accentInk)', borderRadius: 2 }}>{m.t.slice(m.o, m.o + m.n)}</mark>{m.t.slice(m.o + m.n)}
  </span>
);

const group = (results) => {
  const by = new Map();
  for (const r of results) { if (!by.has(r.p)) by.set(r.p, []); by.get(r.p).push(r); }
  return [...by];
};

/** Full-text search over the decompiled code, resources and manifest. */
export function SearchPanel({ id, focusKey, onOpen, onTerm }) {
  const [q, setQ] = useState('');
  const [scope, setScope] = useState('all');
  const [flags, setFlags] = useState({ regex: false, cs: false, word: false });
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(0);
  const input = useRef(null);

  useEffect(() => { input.current?.focus(); input.current?.select(); }, [focusKey]);

  useEffect(() => {
    if (!q.trim()) { setRes(null); onTerm(null); return undefined; }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const j = await jx.search(id, q, { scope, ...flags }, ctl.signal);
        setRes(j); setSel(0);
        onTerm(scope === 'names' ? null : { q, ...flags });
      } catch (e) { if (e.name !== 'AbortError') setRes({ ok: false, error: e.message, results: [] }); }
      if (!ctl.signal.aborted) setBusy(false);
    }, 250);                                                      // debounce; the server also cancels the previous run
    return () => { clearTimeout(t); ctl.abort(); };
  }, [id, q, scope, flags.regex, flags.cs, flags.word]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = res?.results || [];
  const go = (m) => onOpen(m.p, m.l ? { l: m.l, c: m.c, n: m.n } : null);
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((i) => Math.min(list.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' && list[sel]) go(list[sel]);
  };
  const files = new Set(list.map((r) => r.p)).size;
  let idx = -1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto' }}>
      <div className="panel-toolbar">
        <input ref={input} className="mono" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
          placeholder="Search code, resources, manifest…  (↑ ↓ Enter)" spellCheck={false}
          style={{ flex: '1 1 220px', minWidth: 0, padding: '5px 9px', background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 7, color: 'var(--ink)', fontSize: 12 }} />
        {SCOPES.map(([k, l]) => <Chip key={k} on={scope === k} sans title={`Search ${k === 'all' ? 'everything' : l.toLowerCase()}`} onClick={() => setScope(k)}>{l}</Chip>)}
        <Chip on={flags.regex} title="Regular expression" onClick={() => setFlags({ ...flags, regex: !flags.regex })}>.*</Chip>
        <Chip on={flags.cs} title="Match case" onClick={() => setFlags({ ...flags, cs: !flags.cs })}>Aa</Chip>
        <Chip on={flags.word} title="Whole word" onClick={() => setFlags({ ...flags, word: !flags.word })}>\b</Chip>
      </div>
      <div className="mono" style={{ padding: '3px 12px', fontSize: 10.5, color: res?.error ? 'var(--err)' : 'var(--ink3)' }}>
        {busy ? 'searching…' : res?.error ? res.error
          : res ? `${list.length}${res.truncated ? '+' : ''} match${list.length === 1 ? '' : 'es'} in ${files} file${files === 1 ? '' : 's'}${res.truncated ? ' (limit reached, narrow the search)' : ''}${res.timedOut ? ' (timed out, partial)' : ''}`
          : 'type to search'}
      </div>
      <div className="scroll mono" style={{ flex: '1 1 auto', minHeight: 0, fontSize: 11.5 }}>
        {group(list).map(([p, ms]) => (
          <div key={p}>
            <div style={{ padding: '3px 12px', color: 'var(--li)', background: 'var(--bg3)', position: 'sticky', top: 0 }}>{p} <span style={{ color: 'var(--ink3)' }}>{ms[0].l ? ms.length : ''}</span></div>
            {ms.map((m) => { idx++; const me = idx; return (
              <div key={`${m.p}:${m.l}:${m.c}`} className={'list-row' + (sel === me ? ' on' : '')} style={{ gap: 10, padding: '1px 12px' }}
                onClick={() => { setSel(me); go(m); }}>
                {m.l ? <><span style={{ color: 'var(--ink3)', flex: '0 0 44px', textAlign: 'right' }}>{m.l}</span><Preview m={m} /></> : <span style={{ color: 'var(--ink2)' }}>open</span>}
              </div>); })}
          </div>
        ))}
      </div>
    </div>
  );
}

const isTrue = (v) => v === true || v === 'true';
const KV = ({ k, v, c }) => v != null && v !== '' && <div className="jx-kv"><span>{k}</span><span style={{ color: c }}>{v}</span></div>;
const Sec = ({ title, children }) => <div className="jx-sec"><h4>{title}</h4>{children}</div>;
/** A labeled status, so the meaning never rests on colour alone: the symbol and the word carry it too. */
const Flag = ({ k, on, risky, yes = 'yes', no = 'no' }) => {
  if (on === undefined || on === null || on === '') return null;
  const hot = isTrue(on) && risky;
  return (
    <div className="jx-kv"><span>{k}</span>
      <span><span className={'jx-flag ' + (hot ? (risky === 'bad' ? 'bad' : 'warn') : 'ok')}>{hot ? '!' : '✓'} {isTrue(on) ? yes : no}</span></span>
    </div>);
};

/** The APK's identity, SDK range, build, security flags and signature, in labeled groups. */
export function InfoView({ info }) {
  if (!info) return <div className="mono preview-note">Reading APK facts…</div>;
  const m = info.manifest, sg = info.signature, meta = info.meta;
  return (
    <div className="scroll mono" style={{ flex: '1 1 auto' }}>
      <Sec title="Identity">
        <KV k="package" v={m.package} />
        <KV k="version" v={m.versionName && `${m.versionName} (${m.versionCode})`} />
      </Sec>
      <Sec title="SDK compatibility">
        <KV k="minSdk" v={m.minSdk} />
        <KV k="targetSdk" v={m.targetSdk} />
      </Sec>
      <Sec title="Build">
        <KV k="decompiled" v={`${meta.sourceFiles} source files · ${meta.tool}`} />
        <KV k="problems" v={`${meta.warnings} warnings, ${meta.errors} errors`} c={meta.errors ? 'var(--err)' : undefined} />
      </Sec>
      <Sec title="Security">
        <Flag k="debuggable" on={m.debuggable} risky="bad" />
        <Flag k="allowBackup" on={m.allowBackup} risky="warn" />
        <Flag k="cleartext" on={m.cleartext} risky="warn" />
        {m.debuggable == null && m.allowBackup == null && m.cleartext == null && <div className="subtle">The manifest sets none of these.</div>}
      </Sec>
      <Sec title="Signature">
        {sg.error && <div style={{ color: 'var(--warn)', fontSize: 11 }}>Could not check the signature: {sg.error}</div>}
        {!sg.error && <>
          <div className="jx-kv"><span>verdict</span><span><span className={'jx-flag ' + (sg.verified ? 'ok' : 'bad')}>{sg.verified ? '✓ verified' : '! NOT verified'}</span></span></div>
          {Object.entries(sg.schemes).filter(([, v]) => v.present).map(([k, v]) => (
            <div key={k}>
              <KV k={k} v={v.verified ? '✓ verified' : '! failed'} c={v.verified ? 'var(--ok)' : 'var(--err)'} />
              {(v.errors || []).map((e, i) => <div key={i} style={{ color: 'var(--err)', paddingLeft: 100, fontSize: 11 }}>{e}</div>)}
            </div>))}
          {sg.signers.map((x, i) => <div key={i} style={{ marginTop: 6 }}><KV k={`signer ${i + 1}`} v={x.subject} /><KV k="SHA-256" v={x.sha256} /><KV k="valid" v={`${x.validFrom} to ${x.validTo}`} /></div>)}
          {(sg.errors || []).map((w, i) => <div key={'e' + i} style={{ color: 'var(--err)', fontSize: 11 }}>{w}</div>)}
          {(() => {
            // Build tools add many META-INF files the v1 signature does not cover. Android ignores them, so show one line, not one per file.
            const loose = sg.warnings.filter((w) => /not protected by signature/.test(w));
            const rest = sg.warnings.filter((w) => !/not protected by signature/.test(w));
            return <>
              {rest.map((w, i) => <div key={i} style={{ color: 'var(--warn)', fontSize: 11 }}>! {w}</div>)}
              {loose.length > 0 && (
                <details style={{ color: 'var(--ink3)', fontSize: 11 }}>
                  <summary style={{ cursor: 'pointer' }}>{loose.length} file{loose.length === 1 ? '' : 's'} in META-INF/ {loose.length === 1 ? 'is' : 'are'} not covered by the v1 signature (added by build tools, harmless). Show</summary>
                  {loose.map((w, i) => <div key={i} style={{ paddingLeft: 12 }}>{w.replace(/ not protected by signature\..*$/, '')}</div>)}
                </details>)}
            </>;
          })()}
        </>}
      </Sec>
    </div>
  );
}

const ICON = { java: 'var(--li)', kt: 'var(--lf)', xml: 'var(--warn)', json: 'var(--ok)', png: 'var(--ok)', webp: 'var(--ok)', jpg: 'var(--ok)', so: 'var(--err)' };
function NodeIcon({ dir, open, name }) {
  if (dir) return (
    <svg className="jx-ico" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.3" strokeLinejoin="round" aria-hidden="true">
      {open ? <path d="M1.5 4.5a1 1 0 0 1 1-1h3l1.5 1.5h6.5a1 1 0 0 1 1 1V7H4L1.5 12z M4 7h10.5L12.5 12.5h-11" /> : <path d="M1.5 4a1 1 0 0 1 1-1h3.2l1.6 1.6h6.2a1 1 0 0 1 1 1v6.4a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z" />}
    </svg>);
  const ext = (name.split('.').pop() || '').toLowerCase();
  return (
    <svg className="jx-ico" viewBox="0 0 16 16" fill="none" stroke={ICON[ext] || 'var(--ink3)'} strokeWidth="1.3" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 1.5h5l3.5 3.5v9a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5z M9 1.5V5h3.5" />
    </svg>);
}

/** Lazy, paged directory tree. Folded package rows come from the server already merged. `filter` narrows what is loaded so far. */
export function Tree({ id, root, selected, onOpen, filter = '' }) {
  const [nodes, setNodes] = useState({});             // path -> { entries, next, loading }
  const [open, setOpen] = useState({});
  const f = filter.trim().toLowerCase();

  const load = async (path, cursor = 0) => {
    setNodes((n) => ({ ...n, [path]: { ...(n[path] || { entries: [] }), loading: true } }));
    try {
      const j = await jx.tree(id, path, cursor);
      setNodes((n) => ({ ...n, [path]: { entries: [...(cursor ? n[path].entries : []), ...j.entries], next: j.next, loading: false } }));
    } catch (e) { setNodes((n) => ({ ...n, [path]: { entries: [], error: e.message, loading: false } })); }
  };
  useEffect(() => { setNodes({}); setOpen({}); load(root); }, [id, root]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (p) => { setOpen((o) => ({ ...o, [p]: !o[p] })); if (!nodes[p]) load(p); };
  const hit = (e) => e.n.toLowerCase().includes(f);
  // A folder stays while the filter is on if its name matches or something already loaded under it does.
  const deep = (path) => (nodes[path]?.entries || []).some((e) => hit(e) || (e.d && open[e.p] && deep(e.p)));
  const rows = (path, depth) => {
    const n = nodes[path];
    if (!n) return null;
    return <>
      {n.entries.filter((e) => !f || hit(e) || (e.d && open[e.p] && deep(e.p))).map((e) => (
        <React.Fragment key={e.p}>
          <div className={'file-row' + (selected === e.p ? ' on' : '')} style={{ paddingLeft: 8 + depth * 12 }} title={e.p}
            onClick={() => (e.d ? toggle(e.p) : onOpen(e.p, null))}>
            <span style={{ flex: '0 0 10px', width: 10, fontSize: 9, color: 'var(--ink3)' }}>{e.d ? (open[e.p] ? '▾' : '▸') : ''}</span>
            <NodeIcon dir={e.d} open={open[e.p]} name={e.n} />
            <span style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: e.d ? 500 : 400, color: e.d ? 'var(--ink)' : 'var(--ink2)' }}>{e.n.replaceAll('/', '.')}</span>
          </div>
          {e.d && open[e.p] && rows(e.p, depth + 1)}
        </React.Fragment>))}
      {n.next != null && <div className="file-row" style={{ paddingLeft: 8 + depth * 12, color: 'var(--accent)' }} onClick={() => load(path, n.next)}>{n.loading ? 'loading…' : 'load more…'}</div>}
      {n.error && <div style={{ padding: '4px 12px', color: 'var(--err)' }}>{n.error}</div>}
    </>;
  };
  return (
    <div className="scroll mono" style={{ flex: '1 1 auto', minHeight: 0, fontSize: 11.5 }}>
      {nodes[root]?.loading && !nodes[root].entries.length ? <div style={{ padding: 12, color: 'var(--ink3)' }}>Reading…</div> : rows(root, 0)}
      {f && <div className="subtle" style={{ padding: '6px 12px' }}>Filtering what is loaded. Open folders to include their files, or use Search for everything.</div>}
    </div>
  );
}

const fmtSize = (b) => (b >= 1024 ** 2 ? `${(b / 1024 ** 2).toFixed(1)} MB` : `${Math.round((b || 0) / 1024)} KB`);

export function AppIcon({ id, path, size = 32 }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!path) return undefined;
    let dead = false, u;
    jx.rawUrl(id, path).then((x) => { u = x; if (!dead) setUrl(x); else URL.revokeObjectURL(x); }).catch(() => {});
    return () => { dead = true; if (u) URL.revokeObjectURL(u); };
  }, [id, path]);
  return url
    ? <img src={url} alt="" width={size} height={size} style={{ borderRadius: 7, display: 'block' }} />
    : <div style={{ width: size, height: size, borderRadius: 7, background: 'var(--bg4)', flex: '0 0 auto' }} />;
}

function CopyText({ text, shown = text, label, onCopied }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {shown}
      <button className="btn-quiet" title={`Copy ${label}`} aria-label={`Copy ${label}`} style={{ padding: 2, display: 'inline-flex' }}
        onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(text).then(() => onCopied?.(label), () => {}); }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15H4.5A1.5 1.5 0 013 13.5v-9A1.5 1.5 0 014.5 3h9A1.5 1.5 0 0115 4.5V5" /></svg>
      </button>
    </span>
  );
}

const AGO = [[60, 's'], [3600, 'min'], [86400, 'h'], [86400 * 30, 'd']];
/** "12 min ago", falling back to the date after a month. The exact time goes in the tooltip. */
const ago = (ms) => {
  const sec = Math.max(0, (Date.now() - ms) / 1000);
  if (sec < 45) return 'just now';
  let div = 1;
  for (const [lim, u] of AGO) { if (sec < lim) return `${Math.floor(sec / div)} ${u} ago`; div = lim; }
  return new Date(ms).toLocaleDateString();
};

/** Red trash button; the tooltip says what it does. */
const TrashButton = ({ onClick }) => (
  <button className="btn-quiet" title="Delete from cache" aria-label="Delete from cache" style={{ padding: '3px 6px', color: 'var(--err)', display: 'inline-flex' }}
    onClick={(e) => { e.stopPropagation(); onClick(); }}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M6 6l1 14a1 1 0 001 1h8a1 1 0 001-1l1-14M10 11v6M14 11v6" />
    </svg>
  </button>
);

const SORTS = {
  newest: ['Newest first', (a, b) => b.createdAt - a.createdAt],
  name: ['Name', (a, b) => (a.label || a.name).localeCompare(b.label || b.name)],
  size: ['Largest first', (a, b) => (b.apkSize || 0) - (a.apkSize || 0)]
};

/** Past scans, like MobSF's Recent Scans: one row per decompiled APK, searchable and sortable. */
export function RecentScans({ items, onOpen, onDelete, onCopied }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('newest');
  const shown = useMemo(() => {
    const f = q.trim().toLowerCase();
    const rows = f ? items.filter((r) => [r.label, r.name, r.package, r.md5].some((x) => x && String(x).toLowerCase().includes(f))) : items;
    return [...rows].sort(SORTS[sort][1]);
  }, [items, q, sort]);
  return (
    <div>
      <div className="jx-recent-bar">
        <h3>Recent scans</h3>
        <div className="field" style={{ flex: '0 1 200px' }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search scans" aria-label="Search scans" />
        </div>
        <select className="jx-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort scans">
          {Object.entries(SORTS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="jx-scans" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr><th /><th>App</th><th>Package</th><th>Version</th><th>SDK</th><th>MD5</th><th className="num">Size</th><th>Scanned</th><th /></tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="jx-scan" onClick={() => onOpen(r)}>
                <td style={{ width: 32 }}><AppIcon id={r.id} path={r.icon} /></td>
                <td>
                  <div style={{ fontWeight: 500 }}>{r.label || r.name}</div>
                  <div className="mono subtle">{r.name}{r.deobf ? ' · deobf' : ''}</div>
                </td>
                <td className="mono" style={{ fontSize: 11 }}>{r.package ? <CopyText text={r.package} label="package name" onCopied={onCopied} /> : '-'}</td>
                <td className="mono" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{r.versionName || '-'}{r.versionCode ? ` (${r.versionCode})` : ''}</td>
                <td className="mono" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{r.minSdk || '?'} to {r.targetSdk || '?'}</td>
                <td className="mono" style={{ fontSize: 11 }} title={r.md5 || ''}>{r.md5 ? <CopyText text={r.md5} shown={r.md5.slice(0, 12)} label="MD5" onCopied={onCopied} /> : '-'}</td>
                <td className="mono num" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{fmtSize(r.apkSize)}</td>
                <td className="mono" style={{ fontSize: 11, whiteSpace: 'nowrap' }} title={new Date(r.createdAt).toLocaleString()}>{ago(r.createdAt)}</td>
                <td style={{ width: 40 }}><TrashButton onClick={() => onDelete(r)} /></td>
              </tr>))}
            {!shown.length && <tr><td colSpan={9} className="subtle" style={{ textAlign: 'center', padding: 16 }}>No scans match "{q}".</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
