import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { startProxy } from './proxy/server.js';

const PROXY_PORT = 8090;   // Loupe's own bridge. NOT 8080: that's Burp/ZAP's default.

/** Runs the capture proxy alongside the dev server so `npm run dev` is enough. */
function loupeProxy() {
  return {
    name: 'loupe-proxy',
    apply: 'serve',
    async configureServer() {
      try {
        const { addresses } = await startProxy({ port: PROXY_PORT });
        const list = addresses.map((a) => `${a.address}:${PROXY_PORT}`).join(', ') || `localhost:${PROXY_PORT}`;
        console.log(`\n  Loupe capture proxy → ${list}\n`);
      } catch (e) {
        console.warn(`\n  Loupe proxy failed to start on ${PROXY_PORT}: ${e.message}\n`);
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), loupeProxy()],
  server: {
    host: 'localhost',
    port: 5173,
    // Serve the bridge on the SAME origin as the page. The browser then never
    // opens a second port, so Brave's HTTPS-upgrade, mixed-content, and
    // localhost-permission blocks (which killed cross-port fetches) can't bite.
    proxy: { '/__loupe': { target: `http://localhost:${PROXY_PORT}`, ws: true } }
  }
});
