import React from 'react';
import { useLoupe } from '../../store.jsx';
import { EmptyState } from '../ui.jsx';

const card = {
  border: '1px solid var(--line)', borderRadius: 11, background: 'var(--bg2)',
  padding: 12, display: 'flex', flexDirection: 'column', gap: 9
};

const fmtGB = (kb) => (kb / 1024 / 1024).toFixed(2) + ' GB';
const fmtRate = (bps) => (bps == null ? '—' : bps >= 1024 * 1024 ? (bps / 1024 / 1024).toFixed(2) + ' MB/s' : (bps / 1024).toFixed(1) + ' KB/s');
const fmtUptime = (sec) => {
  if (sec == null) return '—';
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return (d ? `${d}d ` : '') + `${h}h ${m}m`;
};

/** Sparkline points for a 100x30 viewBox. */
function spark(values, min, max) {
  if (values.length < 2) return '';
  const n = values.length;
  return values.map((v, i) => {
    const x = (i / (n - 1)) * 100;
    const y = 30 - ((v - min) / (max - min || 1)) * 28;
    return `${x.toFixed(1)},${Math.max(1, Math.min(29, y)).toFixed(1)}`;
  }).join(' ');
}

function Sparkline({ label, value, unit, sub, series, color, min = 0, max = 100 }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="label">{label}</span>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>live</span>
      </div>
      <div className="mono" style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.5px' }}>
        {value}<span style={{ fontSize: 12, color: 'var(--ink3)', marginLeft: 3 }}>{unit}</span>
      </div>
      {sub && <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: -4 }}>{sub}</div>}
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: '100%', height: 52, overflow: 'visible' }}>
        <polyline points={spark(series, min, max)} fill="none" stroke={color} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function Rows({ label, rows }) {
  return (
    <div style={card}>
      <span className="label">{label}</span>
      {rows.map(([k, v, color]) => (
        <div key={k} className="mono" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11 }}>
          <span style={{ color: 'var(--ink3)' }}>{k}</span>
          <span style={{ color: color || 'var(--ink)', textAlign: 'right' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/** Live device telemetry: CPU, memory, battery, storage, and system. */
export function Perf() {
  const { s } = useLoupe();

  if (!s.connected) return <EmptyState>Connect a device to sample performance.</EmptyState>;
  if (s.perf.length === 0) return <EmptyState>Sampling the device every 2s…</EmptyState>;

  const last = s.perf[s.perf.length - 1];
  const cpuSeries = s.perf.map((p) => p.cpu ?? 0);
  const memSeries = s.perf.map((p) => p.mem?.pct ?? 0);
  const fpsSeries = s.perf.map((p) => p.fps ?? 0);
  const b = last.battery || {};
  const st = last.storage;
  const nw = last.network;
  const rssiColor = nw?.rssi == null ? 'var(--ink)' : nw.rssi >= -60 ? 'var(--ok)' : nw.rssi >= -75 ? 'var(--warn)' : 'var(--err)';

  const healthColor = ['overheat', 'dead', 'failure', 'over-voltage', 'cold'].includes(b.health) ? 'var(--warn)' : 'var(--ok)';
  const tempColor = b.tempC == null ? 'var(--ink)' : b.tempC >= 40 ? 'var(--err)' : b.tempC >= 35 ? 'var(--warn)' : 'var(--ink)';

  return (
    <div className="scroll" style={{
      flex: '1 1 auto', padding: 12, display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(215px,1fr))', gap: 12, alignContent: 'start'
    }}>
      <Sparkline label="CPU" value={last.cpu == null ? '—' : last.cpu.toFixed(1)} unit="%"
        series={cpuSeries} color="var(--accentFill)" />

      <Sparkline label="Memory" value={last.mem ? last.mem.pct.toFixed(1) : '—'} unit="%"
        sub={last.mem ? `${fmtGB(last.mem.used)} / ${fmtGB(last.mem.total)}` : ''}
        series={memSeries} color="var(--ok)" />

      <Sparkline label="FPS" value={last.fps == null ? '—' : Math.round(last.fps)} unit="fps"
        sub={last.fpsApp ? `foreground: ${last.fpsApp}` : 'no foreground app'}
        series={fpsSeries} color="var(--warn)" min={0} max={120} />

      <Rows label="Battery" rows={[
        ['level', Number.isFinite(b.level) ? b.level + '%' : '—'],
        ['status', b.status || '—'],
        ['health', b.health || '—', healthColor],
        ['temperature', b.tempC != null ? b.tempC.toFixed(1) + ' °C' : '—', tempColor],
        ['voltage', b.voltageV != null ? b.voltageV.toFixed(3) + ' V' : '—'],
        ['technology', b.tech || '—'],
        ['power', b.plugged || '—']
      ]} />

      <Rows label="Network" rows={nw ? [
        ['type', nw.type || '—'],
        ...(nw.ssid ? [['ssid', nw.ssid]] : []),
        ['ip', nw.ip || '—'],
        ...(nw.rssi != null ? [['signal', nw.rssi + ' dBm', rssiColor]] : []),
        ...(nw.linkMbps != null ? [['link', nw.linkMbps + ' Mbps']] : []),
        ['down', fmtRate(nw.rxRate)],
        ['up', fmtRate(nw.txRate)]
      ] : [['status', 'no active connection']]} />

      <Rows label="Storage (/data)" rows={st ? [
        ['used', fmtGB(st.used)],
        ['total', fmtGB(st.total)],
        ['free', fmtGB(st.avail)],
        ['used %', st.pct.toFixed(1) + '%', st.pct >= 90 ? 'var(--err)' : st.pct >= 75 ? 'var(--warn)' : 'var(--ink)']
      ] : [['data', 'unavailable']]} />

      <Rows label="System" rows={[
        ['uptime', fmtUptime(last.uptime)],
        ['load avg', last.load || '—'],
        ['samples', String(s.perf.length)]
      ]} />
    </div>
  );
}
