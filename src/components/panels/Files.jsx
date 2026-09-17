import React, { useEffect, useRef, useState } from 'react';
import { useLoupe } from '../../store.jsx';
import { Chip, Mini, Search, EmptyState } from '../ui.jsx';

const textPre = {
  flex: '1 1 auto', margin: 0, padding: '9px 11px', fontSize: 11,
  lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word'
};

/** HTML: rendered in a locked-down iframe by default, raw source on demand. */
function HtmlView({ url, text }) {
  const [raw, setRaw] = useState(false);
  return (
    <>
      <div className="preview-head mono" style={{ borderTop: '1px solid var(--line)' }}>
        <span style={{ color: 'var(--ink3)' }}>{raw ? 'source' : 'rendered · scripts disabled'}</span>
        <div className="spacer" />
        <Mini label={raw ? 'Rendered' : 'Source'} onClick={() => setRaw((v) => !v)} />
      </div>
      {raw
        ? <pre className="scroll mono" style={textPre}>{text}</pre>
        : <iframe title="preview" src={url} sandbox=""
            style={{ flex: '1 1 auto', minHeight: 0, border: 0, background: '#fff' }} />}
    </>
  );
}

/** SQLite: one tab per table, first rows of the active table in a grid. */
function SqliteView({ tables }) {
  const [i, setI] = useState(0);
  if (!tables.length) return <div className="mono preview-note">No tables in this database.</div>;
  const t = tables[Math.min(i, tables.length - 1)];
  return (
    <>
      <div className="panel-toolbar" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        {tables.map((tb, n) => (
          <Chip key={tb.name} on={n === i} onClick={() => setI(n)}>{tb.name}</Chip>
        ))}
      </div>
      <div className="scroll" style={{ flex: '1 1 auto', minHeight: 0 }}>
        <table className="mono" style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
          <thead>
            <tr>{t.columns.map((c) => (
              <th key={c} style={{
                position: 'sticky', top: 0, textAlign: 'left', padding: '5px 9px', whiteSpace: 'nowrap',
                background: 'var(--bg2)', borderBottom: '1px solid var(--line)', color: 'var(--ink3)'
              }}>{c}</th>
            ))}</tr>
          </thead>
          <tbody>
            {t.rows.map((r, ri) => (
              <tr key={ri}>{r.map((v, ci) => (
                <td key={ci} style={{
                  padding: '4px 9px', borderBottom: '1px solid var(--line)', color: 'var(--ink2)',
                  maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }} title={v == null ? 'NULL' : String(v)}>
                  {v == null ? <span style={{ color: 'var(--ink3)' }}>NULL</span> : String(v)}
                </td>
              ))}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel-foot"><span>{t.rows.length} of {t.total} rows{t.rows.length < t.total ? ' (first 200)' : ''}</span></div>
    </>
  );
}

/** Right-hand preview for the selected file. */
function Preview() {
  const { s } = useLoupe();

  if (s.previewBusy) {
    return <div className="mono preview-note">Reading…</div>;
  }
  if (!s.fileSel) {
    return <div className="mono preview-note">Select a file to preview it.</div>;
  }
  if (s.fileSel.type === 'd') {
    return <div className="mono preview-note">{s.fileSel.name}: folder. Open it to browse.</div>;
  }
  if (!s.preview) {
    return <div className="mono preview-note">No preview available.</div>;
  }

  const { kind, url, text, tables, name, truncated, size } = s.preview;

  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="preview-head mono">
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        {truncated && <span style={{ color: 'var(--warn)', flex: '0 0 auto' }}>truncated</span>}
      </div>

      {/* Absolute fill + object-fit:contain always fits the pane, whatever the
          image's natural size, without the layout growing to match it. */}
      {kind === 'image' && (
        <div style={{ flex: '1 1 auto', minHeight: 0, position: 'relative', padding: 12 }}>
          <img src={url} alt={name} style={{
            position: 'absolute', inset: 12,
            width: 'calc(100% - 24px)', height: 'calc(100% - 24px)',
            objectFit: 'contain', objectPosition: 'center'
          }} />
        </div>
      )}

      {kind === 'html' && <HtmlView key={name} url={url} text={text} />}

      {kind === 'pdf' && (
        <iframe title={name} src={url} style={{ flex: '1 1 auto', minHeight: 0, border: 0, background: '#fff' }} />
      )}

      {kind === 'audio' && (
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <audio controls src={url} style={{ width: '100%' }} />
        </div>
      )}

      {kind === 'video' && (
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <video controls src={url} style={{ maxWidth: '100%', maxHeight: '100%' }} />
        </div>
      )}

      {kind === 'sqlite' && <SqliteView key={name} tables={tables} />}

      {kind === 'text' && (
        <pre className="scroll mono" style={textPre}>{text}</pre>
      )}

      {kind === 'binary' && (
        <div className="mono preview-note">
          Binary file{size ? ` · ${size}` : ''}: no inline preview.<br />
          Use <span style={{ color: 'var(--ink2)' }}>Download</span> to pull it to your computer.
        </div>
      )}
    </div>
  );
}

export function Files() {
  const { s, set, loadFiles, selectFile, downloadFile, uploadFiles,
          deleteEntry, copyEntry, cutEntry, pasteHere, newFolder,
          searchFiles, clearSearch, revealPath } = useLoupe();
  const uploadRef = useRef(null);

  const path = s.path;
  const parts = path.split('/').filter(Boolean);
  const crumbs = [{ label: '/', p: '/' }].concat(
    parts.map((p, i) => ({ label: p, p: '/' + parts.slice(0, i + 1).join('/') }))
  );

  useEffect(() => {
    if (s.connected && s.files.length === 0 && !s.filesBusy) loadFiles(path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.connected]);

  if (!s.connected) return <EmptyState>Connect a device to browse its filesystem.</EmptyState>;

  const sel = s.fileSel;
  const selEntry = sel && s.files.find((f) => f[0] === sel.name);
  const q = s.fileQ.trim().toLowerCase();
  const shown = q ? s.files.filter((f) => f[0].toLowerCase().includes(q)) : s.files;
  const results = s.findResults;
  const up = () => loadFiles(parts.length ? '/' + parts.slice(0, -1).join('/') : '/');

  const open = (entry) => {
    if (entry[1] === 'd') loadFiles((path === '/' ? '' : path) + '/' + entry[0]);
    else selectFile(entry);
  };

  return (
    <>
      {/* Row 1 — search leads, then the actions that create or add things. */}
      <div className="panel-toolbar">
        <Search value={s.fileQ} grow="0 1 50%"
          placeholder="filter folder: Enter to search all subfolders…"
          onChange={(e) => set({ fileQ: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') searchFiles(s.fileQ); }} />
        <Mini label={s.findBusy ? 'Searching…' : 'Search ⏎'} disabled={s.findBusy || !s.fileQ.trim()}
          onClick={() => searchFiles(s.fileQ)} />
        <div className="spacer" style={{ minWidth: 8 }} />
        <Mini label="New folder" onClick={() => {
          const name = window.prompt('New folder name');
          if (name) newFolder(name.trim());
        }} />
        <Mini label="Upload" tone="accent" onClick={() => uploadRef.current?.click()} />
        <input ref={uploadRef} type="file" multiple hidden
          onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }} />
        <Mini label={s.clipboard ? `Paste (${s.clipboard.name})` : 'Paste'}
          onClick={pasteHere} disabled={!s.clipboard} />
      </div>

      {/* Row 2 — where you are on the left, what you can do with the selected
          entry on the right. Pairing them means the path you're acting on and
          the destructive buttons are read in one glance. */}
      <div className="panel-toolbar" style={{ borderTop: 'none' }}>
        <Mini label="↑ up" onClick={up} />
        {crumbs.map((c, i) => (
          <Chip key={c.p} on={i === crumbs.length - 1} className="crumb" onClick={() => loadFiles(c.p)}>
            {c.label}
          </Chip>
        ))}
        <div className="spacer" style={{ minWidth: 8 }} />
        {selEntry && (
          <>
            <span className="mono" style={{
              fontSize: 11, color: 'var(--ink2)', flex: '0 1 auto', minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {selEntry[1] === 'd' ? '▸' : '·'} {selEntry[0]}
            </span>
            <Mini label="Download" onClick={() => downloadFile(selEntry)} />
            <Mini label="Copy" onClick={() => copyEntry(selEntry)} />
            <Mini label="Cut" onClick={() => cutEntry(selEntry)} />
            <Mini tone="danger" label="Delete" onClick={() => {
              if (window.confirm(`Delete ${selEntry[0]}?`)) deleteEntry(selEntry);
            }} />
          </>
        )}
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateRows: 'minmax(0,1fr)', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)' }}>
        {/* listing */}
        <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)' }}>
          {results && (
            <div className="panel-foot" style={{ borderBottom: '1px solid var(--line)', borderTop: 'none' }}>
              <span>{results.length} result{results.length === 1 ? '' : 's'} under {s.findRoot}</span>
              <div className="spacer" />
              <Mini label="Back to folder" onClick={clearSearch} />
            </div>
          )}

          <div className="scroll mono" style={{ flex: '1 1 auto', fontSize: 11.5 }}>
            {s.findBusy && <div style={{ color: 'var(--ink3)', padding: '10px 12px' }}>Searching {s.path}…</div>}

            {results && !s.findBusy && results.length === 0 && (
              <div style={{ color: 'var(--ink3)', padding: '10px 12px' }}>No matches.</div>
            )}

            {results && results.map((r) => {
              const cut = r.path.lastIndexOf('/');
              const dir = cut <= 0 ? '/' : r.path.slice(0, cut);
              const name = r.path.slice(cut + 1);
              return (
                <div key={r.kind + r.path} className="file-row" title={r.path}
                  onClick={() => revealPath(r.path, r.kind)}>
                  <span style={{ flex: '0 0 auto', width: 12, color: r.kind === 'd' ? 'var(--accent)' : 'var(--ink3)' }}>
                    {r.kind === 'd' ? '▸' : '·'}
                  </span>
                  {/* name first, parent dimmed — long paths stay readable */}
                  <span style={{ flex: '0 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: r.kind === 'd' ? 'var(--ink)' : 'var(--ink2)' }}>
                    {name}
                  </span>
                  <span style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', color: 'var(--ink3)', fontSize: 10 }}>
                    {dir}
                  </span>
                </div>
              );
            })}

            {!results && s.filesBusy && <div style={{ color: 'var(--ink3)', padding: '10px 12px' }}>Reading {path}…</div>}
            {!results && !s.filesBusy && shown.length === 0 && (
              <div style={{ color: 'var(--ink3)', padding: '10px 12px' }}>
                {s.files.length === 0 ? 'Empty, or permission denied.' : `Nothing here matches “${s.fileQ}”.`}
              </div>
            )}
            {!results && shown.map((f) => {
              const isDir = f[1] === 'd';
              const active = sel?.name === f[0];
              return (
                <div key={f[0]} className={'file-row' + (active ? ' on' : '')}
                  onClick={() => selectFile(f)} onDoubleClick={() => open(f)}>
                  <span style={{ flex: '0 0 auto', width: 12, color: isDir ? 'var(--accent)' : 'var(--ink3)' }}>
                    {isDir ? '▸' : '·'}
                  </span>
                  <span style={{
                    flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', color: isDir ? 'var(--ink)' : 'var(--ink2)'
                  }}>{f[0]}</span>
                  <span style={{ color: 'var(--ink3)', flex: '0 0 auto', width: 74, textAlign: 'right' }}>
                    {isDir ? '—' : f[2]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="panel-foot">
            <span>{q ? `${shown.length} / ${s.files.length}` : s.files.length} entries</span>
          </div>
        </div>

        {/* preview */}
        <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Preview />
        </div>
      </div>

      {s.transfer && (
        <div className="panel-foot" style={{ color: 'var(--accent)' }}>
          <span className="mono">{s.transfer}</span>
        </div>
      )}
    </>
  );
}
