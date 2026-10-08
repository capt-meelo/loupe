import React, { useState } from 'react';
import { useLoupe, DEFAULT_LAYOUT } from '../store.jsx';
import { Icon, Tab, useDismiss } from './ui.jsx';

/** A resizable panel slot: draggable tab strip, pane menu, maximize / collapse, and the active panel. */
export function PanelSlot({ defs, active, open, other, split, isTop, panels, onMoveTab }) {
  const { set } = useLoupe();
  const [over, setOver] = useState(false);
  const [overId, setOverId] = useState(null);           // tab the drag is hovering, to show where it will land
  const [menu, setMenu] = useState(false);
  const closeMenu = () => setMenu(false);
  const menuRef = useDismiss(menu, closeMenu);
  const slotKey = isTop ? 'top' : 'bottom';
  const openKey = isTop ? 'topOpen' : 'bottomOpen';
  const otherKey = isTop ? 'bottomOpen' : 'topOpen';

  const style = open
    ? {
        flex: other ? `1 1 ${split * 100}%` : '1 1 auto', minHeight: 120,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--bg2)'
      }
    : {
        flex: '0 0 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--bg2)'
      };

  const Body = panels[active];

  const clear = () => { setOver(false); setOverId(null); };
  const dragStart = (id) => (e) => { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; };
  const allowDrop = (id = null) => (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(true); setOverId(id); };
  const drop = (beforeId) => (e) => {
    e.preventDefault(); e.stopPropagation(); clear();
    const id = e.dataTransfer.getData('text/plain');
    if (id) onMoveTab(id, slotKey, beforeId);
  };

  const pick = (id) => { closeMenu(); set({ [slotKey]: id, [openKey]: true }); };
  const moveActive = () => { closeMenu(); if (active) onMoveTab(active, isTop ? 'bottom' : 'top'); };
  const reset = () => { closeMenu(); set(DEFAULT_LAYOUT); };

  return (
    <section style={style}>
      <div className="panel-bar" onDragOver={allowDrop()} onDragLeave={clear} onDrop={drop(null)}
        style={over && overId === null ? { boxShadow: 'inset 0 -2px 0 var(--accentFill)' } : undefined}>
        <div className="panel-tabs">
          {defs.map((d) => (
            <span key={d.id} draggable onDragStart={dragStart(d.id)} onDragOver={allowDrop(d.id)} onDrop={drop(d.id)}
              className={overId === d.id ? 'tab-drop' : undefined}
              style={{ display: 'inline-flex', height: '100%' }} title="Drag to reorder or move to the other pane">
              <Tab on={active === d.id} label={d.label} badge={d.badge}
                onClick={() => set({ [slotKey]: d.id, [openKey]: true })} />
            </span>
          ))}
        </div>
        <div className="panel-actions" ref={menuRef}>
          <button className="icon-sq" title="Maximize" aria-label="Maximize this pane" onClick={() => set({ [openKey]: true, [otherKey]: false })}>
            <Icon size={13} d="M6 2H2v4M10 14h4v-4" />
          </button>
          <button className="icon-sq" title={open ? 'Collapse' : 'Expand'} aria-label={open ? 'Collapse this pane' : 'Expand this pane'} onClick={() => set({ [openKey]: !open })}>
            <span style={{ fontSize: 11, display: 'inline-block', transform: open ? 'none' : 'rotate(-90deg)' }}>▾</span>
          </button>
          <button className="icon-sq" title="Pane menu" aria-label="Pane menu" onClick={() => setMenu((m) => !m)}>
            <Icon size={14}><circle cx="3" cy="8" r="1" /><circle cx="8" cy="8" r="1" /><circle cx="13" cy="8" r="1" /></Icon>
          </button>
          {menu && (
            <div className="menu pane-menu" style={{ top: 'calc(100% + 2px)', left: 'auto', right: 0, width: 220, maxHeight: 360, overflow: 'auto' }}>
              <div className="label" style={{ padding: '4px 8px' }}>Tabs in this pane</div>
              {defs.map((d) => (
                <button key={d.id} className={'menu-item' + (active === d.id ? ' on' : '')} onClick={() => pick(d.id)}>
                  {d.label}{d.badge ? <span className="tab-badge">{d.badge}</span> : null}
                </button>
              ))}
              <div className="menu-sep" />
              <button className="menu-item" onClick={moveActive} disabled={!active}>
                Move this tab to the {isTop ? 'bottom' : 'top'} pane
              </button>
              <button className="menu-item" onClick={reset}>Reset layout</button>
            </div>
          )}
        </div>
      </div>

      {open && Body && (
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Body />
        </div>
      )}
    </section>
  );
}
