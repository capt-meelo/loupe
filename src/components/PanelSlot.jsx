import React, { useState } from 'react';
import { useLoupe } from '../store.jsx';
import { Icon, Tab } from './ui.jsx';

/** A resizable panel slot: draggable tab strip, maximize / collapse, and the active panel. */
export function PanelSlot({ defs, active, open, other, split, isTop, panels, onMoveTab }) {
  const { set } = useLoupe();
  const [over, setOver] = useState(false);
  const slotKey = isTop ? 'top' : 'bottom';
  const openKey = isTop ? 'topOpen' : 'bottomOpen';
  const otherKey = isTop ? 'bottomOpen' : 'topOpen';

  const style = open
    ? {
        flex: other ? `1 1 ${split * 100}%` : '1 1 auto', minHeight: 120,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        borderBottom: isTop ? '1px solid var(--line)' : 'none'
      }
    : {
        flex: '0 0 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        borderBottom: isTop ? '1px solid var(--line)' : 'none'
      };

  const Body = panels[active];

  const dragStart = (id) => (e) => { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; };
  const allowDrop = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(true); };
  const drop = (beforeId) => (e) => {
    e.preventDefault(); e.stopPropagation(); setOver(false);
    const id = e.dataTransfer.getData('text/plain');
    if (id) onMoveTab(id, slotKey, beforeId);
  };

  return (
    <section style={style}>
      <div className="panel-bar" onDragOver={allowDrop} onDragLeave={() => setOver(false)} onDrop={drop(null)}
        style={over ? { boxShadow: 'inset 0 0 0 1px var(--accent)' } : undefined}>
        {defs.map((d) => (
          <span key={d.id} draggable onDragStart={dragStart(d.id)} onDragOver={allowDrop} onDrop={drop(d.id)}
            style={{ display: 'inline-flex' }} title="Drag to reorder or move to the other pane">
            <Tab on={active === d.id} label={d.label} badge={d.badge}
              onClick={() => set({ [slotKey]: d.id, [openKey]: true })} />
          </span>
        ))}
        <div className="spacer" style={{ minWidth: 12 }} />
        <button className="icon-sq" title="Maximize" onClick={() => set({ [openKey]: true, [otherKey]: false })}>
          <Icon size={13} d="M6 2H2v4M10 14h4v-4" />
        </button>
        <button className="icon-sq" title="Show / hide" onClick={() => set({ [openKey]: !open })}>
          <span style={{ fontSize: 11, display: 'inline-block', transform: open ? 'none' : 'rotate(-90deg)' }}>▾</span>
        </button>
      </div>

      {open && Body && (
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Body />
        </div>
      )}
    </section>
  );
}
