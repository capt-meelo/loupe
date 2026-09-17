/**
 * Wireless ADB transport for the browser.
 *
 * The page can't open TCP sockets, so this implements ya-webadb's `AdbTransport`
 * against the Node bridge (see proxy/adb-bridge.js): each ADB service —
 * `shell:`, `sync:`, `localabstract:scrcpy`, … — becomes one WebSocket that
 * relays bytes to the device.
 *
 * Because it satisfies the same interface as the USB transport, everything
 * built on top (shell, sync, logcat, files, scrcpy) works unchanged over Wi-Fi.
 */
import {
  AdbBanner,
  AdbReverseNotSupportedError,
  ADB_SERVER_DEFAULT_FEATURES
} from '@yume-chan/adb';
import { ReadableStream, MaybeConsumable } from '@yume-chan/stream-extra';

// Same-origin: Vite proxies /__loupe to the bridge, so we never name its port.
// HTTP is a relative path; the WebSocket URL is derived from the page's own host.
const httpBase = '/__loupe/adb';
const wsBase = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/__loupe/adb/socket`;

async function api(path, init) {
  const res = await fetch(`${httpBase}${path}`, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok && body.error) throw new Error(body.error);
  return body;
}

export const listDevices = async () => (await api('/devices')).devices || [];
export const listMdns = async () => (await api('/mdns')).services || [];

export const pair = (addr, code) =>
  api('/pair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addr, code })
  });

export const connectTcp = (addr) =>
  api('/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addr })
  });

/** Stops the host adb server so it releases any USB devices it claimed. */
export const killServer = () => api('/kill-server', { method: 'POST' });

/** One ADB service, relayed over a WebSocket. */
function openService(serial, service) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `${wsBase}?serial=${encodeURIComponent(serial)}&service=${encodeURIComponent(service)}`
    );
    ws.binaryType = 'arraybuffer';

    let closedResolve;
    const closed = new Promise((r) => { closedResolve = r; });

    let controller = null;
    const readable = new ReadableStream({
      start(c) { controller = c; }
    });

    ws.onmessage = (e) => {
      if (!controller) return;
      const data = e.data instanceof ArrayBuffer ? new Uint8Array(e.data) : null;
      if (data && data.length) {
        try { controller.enqueue(data); } catch { /* already closed */ }
      }
    };
    ws.onclose = () => {
      try { controller?.close(); } catch { /* already closed */ }
      closedResolve(undefined);
    };
    ws.onerror = () => {
      try { controller?.close(); } catch { /* already closed */ }
      closedResolve(undefined);
    };

    // MaybeConsumable unwraps Consumable<Uint8Array> for us, exactly as the
    // USB transport does — send the raw bytes down the socket.
    const writable = new MaybeConsumable.WritableStream({
      write: (chunk) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
      }
    });

    ws.onopen = () =>
      resolve({
        service,
        readable,
        writable,
        closed,
        close: async () => { try { ws.close(); } catch { /* gone */ } }
      });

    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        try { ws.close(); } catch { /* gone */ }
        reject(new Error(`could not open ${service}: is the device still connected?`));
      }
    }, 15000);
  });
}

/** AdbTransport backed by the bridge. */
class WirelessTransport {
  #serial;
  #banner;
  #maxPayloadSize;
  #disconnected;
  #disconnect;

  constructor(info) {
    this.#serial = info.serial;
    this.#maxPayloadSize = info.maxPayloadSize || 1024 * 1024;
    // Order matches AdbBanner(state, product, model, device, features), and
    // `features` must be a real array — Adb.canUseFeature() calls .includes()
    // on it for every capability check.
    this.#banner = new AdbBanner(
      info.state || 'device',
      info.product || undefined,
      info.model || undefined,
      info.device || undefined,
      Array.isArray(info.features) ? info.features : []
    );
    this.#disconnected = new Promise((r) => { this.#disconnect = r; });
  }

  get serial() { return this.#serial; }
  get maxPayloadSize() { return this.#maxPayloadSize; }
  get banner() { return this.#banner; }
  get disconnected() { return this.#disconnected; }
  get clientFeatures() { return ADB_SERVER_DEFAULT_FEATURES; }

  connect(service) { return openService(this.#serial, service); }

  // Reverse tunnels would need the bridge to listen on the device's behalf.
  // scrcpy detects this and falls back to a forward tunnel, which the service
  // relay handles fine.
  addReverseTunnel() { throw new AdbReverseNotSupportedError(); }
  removeReverseTunnel() { throw new AdbReverseNotSupportedError(); }
  clearReverseTunnels() { /* nothing to clear */ }

  close() { this.#disconnect(); }
}

/** Builds a transport for an already-connected (paired) wireless device. */
export async function createTransport(serial) {
  const info = await api(`/info?serial=${encodeURIComponent(serial)}`);
  if (!info.ok) throw new Error(info.error || 'device not connected');
  return new WirelessTransport(info);
}
