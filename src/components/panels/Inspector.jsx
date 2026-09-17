import React from 'react';
import { useLoupe } from '../../store.jsx';
import { EmptyState } from '../ui.jsx';

/** Real view hierarchy via `uiautomator dump`. */
export function Inspector() {
  const { s, set, loadHierarchy } = useLoupe();

  if (!s.connected) return <EmptyState>Connect a device to dump the view hierarchy.</EmptyState>;

  const node = s.nodes.find((n) => n.id === s.insSel) || s.nodes[0];

  const attrs = node ? [
    { k: 'class', v: node.fullClass || '—' },
    { k: 'resource-id', v: node.rid || '—' },
    { k: 'text', v: node.text || '—' },
    { k: 'content-desc', v: node.desc || '—' },
    { k: 'bounds', v: node.bounds || '—' },
    { k: 'clickable', v: node.clickable || '—' },
    { k: 'focusable', v: node.focusable || '—' },
    { k: 'enabled', v: node.enabled || '—' },
    { k: 'package', v: node.pkg || '—' },
    { k: 'depth', v: String(node.depth) }
  ] : [];

  return (
    <>
      <div className="panel-toolbar">
        <button className="btn-quiet" onClick={loadHierarchy} disabled={s.insBusy}>
          {s.insBusy ? 'Dumping…' : 'Dump hierarchy'}
        </button>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>
          uiautomator dump · {s.nodes.length} nodes
        </span>
      </div>

      {s.nodes.length === 0 ? (
        <EmptyState>No hierarchy yet: press <span style={{ color: 'var(--ink2)' }}>Dump hierarchy</span>.</EmptyState>
      ) : (
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateRows: 'minmax(0,1fr)', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
          <div className="scroll mono" style={{ borderRight: '1px solid var(--line)', padding: '6px 0', fontSize: 11 }}>
            {s.nodes.map((n) => (
              <button key={n.id} onClick={() => set({ insSel: n.id })} style={{
                display: 'flex', gap: 6, width: '100%', textAlign: 'left', padding: '3px 11px',
                background: s.insSel === n.id ? 'var(--accentSoft)' : 'transparent',
                fontFamily: 'inherit', fontSize: 11
              }}>
                <span style={{ color: 'var(--ink3)' }}>{'·'.repeat(n.depth * 2)}{n.depth ? ' ' : ''}</span>
                <span style={{ color: 'var(--li)' }}>{n.cls}</span>
                {n.rid && <span style={{ color: 'var(--ink3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.rid.split('/').pop()}</span>}
                {n.text && <span style={{ color: 'var(--ink2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{n.text}"</span>}
              </button>
            ))}
          </div>
          <div className="scroll mono" style={{ padding: '10px 12px', fontSize: 11, lineHeight: 1.8 }}>
            {attrs.map((a) => (
              <div key={a.k} style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--ink3)', flex: '0 0 108px' }}>{a.k}</span>
                <span style={{ flex: '1 1 auto', minWidth: 0, wordBreak: 'break-all' }}>{a.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
