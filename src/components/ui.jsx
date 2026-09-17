import React, { useEffect, useRef, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

export const Icon = ({ d, size = 15, sw = 1.4, children }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d} /> : null}{children}
  </svg>
);

export const SearchIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--ink3)" strokeWidth="1.5">
    <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" />
  </svg>
);

export const Chip = ({ on, sans, className = '', children, ...rest }) => (
  <button className={['chip', on ? 'on' : '', sans ? 'sans' : '', className].filter(Boolean).join(' ')} {...rest}>
    {children}
  </button>
);

export const Tab = ({ on, label, badge, ...rest }) => (
  <button className={on ? 'tab on' : 'tab'} {...rest}>
    {label}
    {badge !== '' && badge !== undefined ? <span className="tab-badge">{badge}</span> : null}
  </button>
);

export const Mini = ({ tone, label, ...rest }) => (
  <button className={'mini' + (tone ? ' ' + tone : '')} {...rest}>{label}</button>
);

export const Search = ({ value, onChange, placeholder, grow = '1 1 180px', min = '140px' }) => (
  <div className="field" style={{ flex: grow, minWidth: min }}>
    <SearchIcon />
    <input value={value} onChange={onChange} placeholder={placeholder} />
  </div>
);

// Android hides the real display label inside APK resources, which ADB can't
// resolve without aapt. So derive a readable name from the package: the last
// meaningful segment, prettified. Returns '' for non-package names (system
// processes like kworker), so callers can show the raw name only.
const GENERIC = new Set(['app', 'android', 'main', 'ui', 'client', 'mobile', 'application', 'service']);
export function friendlyName(pkg) {
  if (!pkg || !pkg.includes('.')) return '';
  const parts = pkg.split('.').filter(Boolean);
  let seg = parts[parts.length - 1];
  if (GENERIC.has(seg.toLowerCase()) && parts.length >= 2) seg = parts[parts.length - 2];
  return seg.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export const RailHeading = ({ children }) => (
  <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink2)', fontWeight: 600 }}>
    {children}
  </span>
);

/** Centered placeholder shown when a panel has no data. */
export const EmptyState = ({ children }) => (
  <div className="mono" style={{
    flex: '1 1 auto', minHeight: 0, display: 'grid', placeItems: 'center',
    padding: '24px', textAlign: 'center', color: 'var(--ink3)', fontSize: '11.5px', lineHeight: 1.7
  }}>
    <div>{children}</div>
  </div>
);

/**
 * Dropdown that picks an installed app, sorted by friendly name, with its icon.
 * Used by Frida (target) and Logcat (filter). `allowAll` prepends an "All apps"
 * entry (picks ''). Open state and selection are owned by the caller.
 */
export function AppSelect({ apps, appIcons = {}, value, placeholder = 'Select app', open, onToggle, onPick, allowAll = false, width = 320 }) {
  const btnRef = useRef(null);
  const [pos, setPos] = useState(null);
  const items = useMemo(() => {
    const sorted = [...apps].sort((a, b) => (friendlyName(a) || a).localeCompare(friendlyName(b) || b));
    return allowAll ? ['', ...sorted] : sorted;
  }, [apps, allowAll]);
  const label = value ? (friendlyName(value) || value) : placeholder;

  // Anchor the menu to the button in viewport coordinates and render it through a
  // portal, so it escapes the panel's `overflow:hidden` instead of being clipped.
  useEffect(() => {
    if (!open || !btnRef.current) { setPos(null); return; }
    const place = () => {
      const r = btnRef.current.getBoundingClientRect();
      const gap = 4, margin = 8;
      const below = window.innerHeight - r.bottom - margin;
      const above = r.top - margin;
      const openUp = below < 240 && above > below;   // flip up only when cramped below
      const maxH = Math.max(160, Math.min(360, (openUp ? above : below) - gap));
      const left = Math.max(margin, Math.min(r.right - width, window.innerWidth - width - margin));
      setPos(openUp
        ? { bottom: window.innerHeight - r.top + gap, left, maxH }
        : { top: r.bottom + gap, left, maxH });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, width]);

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button ref={btnRef} className="mini" onClick={() => onToggle(!open)} title={value || placeholder}
        style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: value ? 'var(--ink)' : 'var(--warn)' }}>
        {label} ▾
      </button>
      {open && pos && createPortal(
        <>
          <div onMouseDown={() => onToggle(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
          <div className="menu" style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, width, maxHeight: pos.maxH, overflow: 'auto', zIndex: 200 }}>
            {apps.length === 0 && <div className="menu-note">No apps listed yet. Open the Apps tab to load them.</div>}
            {items.map((pkg) => (
              <button key={pkg || '__all__'} className={'menu-item' + (value === pkg ? ' on' : '')}
                style={{ padding: '6px 8px', gap: 8, alignItems: 'center' }}
                onClick={() => { onPick(pkg); onToggle(false); }}>
                {pkg && appIcons[pkg]
                  ? <img src={appIcons[pkg]} width={18} height={18} alt="" style={{ flex: '0 0 auto', borderRadius: 4 }} />
                  : <span style={{ flex: '0 0 auto', width: 18 }} />}
                <span className="mono" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pkg ? (friendlyName(pkg) || pkg) : 'All apps'}
                </span>
                {pkg && <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink3)', marginLeft: 'auto', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pkg}</span>}
              </button>
            ))}
          </div>
        </>,
        document.body)}
    </div>
  );
}

/** Closes a popover on outside click or Escape. */
export function useDismiss(open, close) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}
