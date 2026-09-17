# Loupe: Internal Reference (Development Notes)

> **This is the internal, full-detail reference for Loupe, kept for the developer
> working in this repo.** It covers architecture, the security model,
> the connection internals, and troubleshooting. The public, GitHub-facing
> README lives in [`README.md`](README.md) and is deliberately short: what the app
> is, its features, and how to run it. Keep deep or sensitive detail here, not there.

---


**A browser-based Android device control hub.** Live logcat, an adb shell, a real
file manager, package management, process and memory inspection, proxy interception, and
a fully interactive screen mirror, with no host `adb` server, no drivers, and no
agent app on the device.

Loupe speaks the ADB wire protocol directly from the browser, over **WebUSB** when
the phone is plugged in or over **Wi-Fi** through a small Node bridge. It mirrors
the screen with **scrcpy** decoded through **WebCodecs**.

---

## Contents

- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Connecting a device](#connecting-a-device)
  - [Over USB](#over-usb)
  - [Over Wi-Fi](#over-wi-fi)
  - [Disconnecting](#disconnecting)
- [Features](#features)
  - [Root mode](#root-mode)
  - [Device rail: mirror and control](#device-rail-mirror-and-control)
  - [Logcat](#logcat)
  - [Network](#network)
  - [Proxy](#proxy)
  - [Performance](#performance)
  - [Memory](#memory)
  - [Inspector](#inspector)
  - [Settings](#settings)
  - [Device Info](#device-info)
  - [Files](#files)
  - [Apps](#apps)
  - [Processes](#processes)
  - [Shell](#shell)
  - [Frida](#frida)
- [What it can't do](#what-it-cant-do)
- [Security model](#security-model)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)

---

## Requirements

| | |
|---|---|
| **Browser** | Chrome or Edge. WebUSB is Chromium-only. Firefox/Safari won't work. |
| **Node** | 20+ (pinned to `v24.20.0` in `.nvmrc`) |
| **Phone** | USB debugging enabled in Developer options |
| **Context** | Served from `localhost` or HTTPS. WebUSB requires a secure context |
| **`xz`** | Only for Frida install; the bridge unpacks the `.xz` server with it (`brew install xz`) |

## Quick start

```bash
nvm use            # picks up .nvmrc
npm install
npm run dev
```

Open <http://localhost:5173>. This also starts the Loupe bridge on port `8090`
(the loopback `/__loupe/*` API for ADB, Frida, and cert preparation).

```bash
npm run build      # production bundle into dist/
npm run preview    # serve the production build
npm run proxy      # run the Loupe bridge on its own
```

## Connecting a device

### Over USB

1. Enable **Developer options → USB debugging** on the phone and plug it in.
2. **Stop any desktop adb server.** It holds the USB interface and will block the
   browser:
   ```bash
   adb kill-server
   ```
   Don't run `adb devices` afterwards; that starts it again.
3. Device menu → **Connect a device over USB** → pick it in the browser prompt →
   tap **Allow USB debugging** on the phone (tick *Always allow*).

The connect sequence prints a step-by-step trace into the Shell panel, so a stall
is visible rather than silent:

```
· opening USB picker…
· claiming interface on <serial>…
· authenticating: accept "Allow USB debugging" on the phone…
· reading device info…
· connected · <model>
```

On timeout the message distinguishes the two very different failures: `rx=0`
(the phone never replied, usually because another adb owns the device) versus
`rx: CNXN,AUTH…` (it replied but authorisation didn't complete).

### Over Wi-Fi

Device menu → **Connect over Wi-Fi**. Three ways in:

| Tab | Use when |
|---|---|
| **Pair code** | First time. Phone shows an address + 6-digit code under *Wireless debugging → Pair device with pairing code*. |
| **QR code** | First time, hands-free. Scan Loupe's QR from *Pair device with QR code*. |
| **Connect** | Already paired. Just type `192.168.1.42:5555`. |

After pairing, the device appears under **Wireless devices**; click it to attach.

**How it works.** A browser cannot open TCP sockets, do mDNS, or perform the
TLS/SPAKE2 handshake Android 11+ requires, so none of this can live in the
page. Loupe's Node bridge (`proxy/adb-bridge.js`) drives the host `adb` binary,
which implements pairing correctly, and relays each ADB *service* (`shell:`,
`sync:`, `localabstract:scrcpy`, …) to the browser over a WebSocket. The browser
implements ya-webadb's `AdbTransport` against that relay, so **every feature works
identically over Wi-Fi**: shell, files, logcat, scrcpy mirroring, memory.

QR pairing follows the same path Android Studio uses: the QR carries a service
name and password, the phone advertises `_adb-tls-pairing._tcp` under that name
once scanned, Loupe finds it with `adb mdns services` and pairs with the QR's
password.

> **One transport at a time.** The host adb server claims USB devices, so USB
> (WebUSB) and Wi-Fi can't both be live. The Wi-Fi panel has a
> **Stop adb server (free USB)** button to hand USB back.

**Requires** `adb`, and only for Wi-Fi. USB needs nothing installed. The bridge
uses `~/Library/Android/sdk/platform-tools/adb` when present and otherwise falls
back to whatever `adb` is on your `PATH`.

### Disconnecting

Two equivalent controls, both shown only while a device is attached:

- **Disconnect** in the header, next to *Refresh*.
- **Disconnect** on the connected device's row in the device menu, beside its
  `usb` / `wi-fi` transport label.

Either one stops mirroring, tears down the logcat and shell streams, closes the
transport, and clears every panel's state (files, apps, processes, inspector,
memory and root mode) so nothing stale carries into the next device.

Over Wi-Fi, disconnecting deliberately leaves the host adb server attached to the
phone, so the device stays listed under **Wireless devices** for a one-click
re-attach, with no re-pairing and no rediscovery. To detach fully (and free USB),
use **Stop adb server (free USB)** in the Wi-Fi panel.

### Rebooting

The header has a **Reboot** menu (shown while a device is attached) that runs
`reboot`, `reboot recovery`, or `reboot bootloader`. The transport drops as the
device goes down, so Loupe resets the UI the same way a disconnect does.

---

## Features

### Root mode

If the device is rooted, Loupe detects it on connect (`su -c id`) and switches on
elevated mode automatically. The header shows the current level (**`$ shell`** or
**`# root`**), and you can toggle it at any time.

With root mode on:

- **Files** can browse, read, write and delete inside `/data/data/...` and other
  protected paths
- **Shell** runs every command through `su` (the prompt changes to `#`)
- **Memory** can read `/proc/<pid>/maps` for any process and dump the heap of
  non-debuggable apps
- **Processes** can kill and force-stop anything

**How it works.** The ADB *sync* service runs as the shell user and ignores `su`,
so it can't be used for protected paths even on a rooted phone. Loupe therefore
lists those directories through a root shell (`ls -laL`, symlinks dereferenced so
links like `/sdcard` stay navigable), and moves file *contents* by staging them
through `/data/local/tmp` (which sync can reach), then `cp`-ing with `su` on the
other side. That keeps transfers binary-safe and fast instead of piping base64
through a shell.

Non-root devices are unaffected: everything still uses the fast sync path, and
Loupe only falls back to a root shell if sync is refused *and* `su` succeeds.

### Device rail: mirror and control

Real screen mirroring over scrcpy, with a real control channel.

- **Live H.264 mirror**: the official scrcpy 3.3.3 server is pushed to the
  device, started over ADB, and decoded in-browser with WebCodecs
- **Sizes to the device**: the canvas matches your phone's actual aspect ratio,
  so there are no letterbox gutters
- **Touch, drag, swipe and scroll**: pointer down/move/up are injected as real
  touch events, mapped to device coordinates
- **Hardware keys**: Power, Volume ±, Back, Home, Recents, Menu
- **Notification shade**, **Wake screen**, **Rotate**
- **Screenshot**: saves a PNG **to your computer**. Uses the decoded mirror
  frame when mirroring, otherwise runs `screencap` on the device, pulls the
  image back and deletes the temp file
- **Screen recording**: records the live mirror and prompts you to save it
  (WebM/VP9). No 3-minute cap, unlike the device's own `screenrecord`. The
  button shows elapsed time while recording
- **Text input**: type into the box and it's injected into the focused field
- **Start/stop mirroring** from the header beside the LIVE indicator

Device properties live in their own [Device Info](#device-info) tab, not the rail.

### Logcat

- Live stream of `logcat -v brief`
- **Level toggles**: V / D / I / W / E / F, colour-coded
- **Text filter** across tag and message
- **App filter**: a dropdown of installed apps (sorted by name, with icons).
  Picking one resolves its running PIDs with `pidof` and narrows the stream to
  those processes; **All apps** clears it
- **Pause / resume**, **Clear**
- **Export** the filtered buffer to a `.txt` file
- Buffered and flushed on an interval, with a capped render window, so a log
  storm doesn't freeze the UI. Logcat starts paused on connect

### Network

Live socket table read from the device (`ss -tunp`, falling back to `netstat`).

- Protocol, connection state, peer and local addresses, owning process
- Colour-coded state (established / listening / other)
- Filter by host, port or process

### Proxy

Routes the device through your own intercepting proxy (Burp, HTTP Toolkit, …) and
sets up what HTTPS interception needs. Loupe is not itself the proxy; it points
the device at yours and handles the device-side plumbing.

- **Device proxy**: a Start/Stop button that sets and clears the device's global
  HTTP proxy (`settings put global http_proxy <host>:<port>`). It reads the live
  value back (`settings get`), so the status pill reflects the device, not a local
  flag. Test connection opens a raw TCP connect to the proxy from the bridge
  (`/__loupe/proxy/test`) to prove it's reachable. The host defaults to this
  machine's LAN address; your proxy must listen on all interfaces so the phone can
  reach it
- **CA certificate**: upload the proxy's CA (DER or PEM). The host's openssl turns
  it into PEM and the Android `subject_hash_old` filename (`/__loupe/cert/prepare`,
  see `proxy/cert.js`). On a Magisk/KernelSU device (`/data/adb/modules` present),
  `installCert` writes a boot module (`loupe-cacerts`) whose `post-fs-data.sh`
  re-applies the store on every boot over both `/system/etc/security/cacerts` and
  the Conscrypt APEX, so it persists across reboots; the same script runs once at
  install time for immediate effect. Without a module manager it falls back to a
  one-shot tmpfs mount that resets on reboot. Root-only either way. Remove deletes
  the module and unmounts the live store

### Performance

- Live **CPU** and **memory** sampled from `/proc` every 2s, with sparklines
- **FPS**: the foreground app's `dumpsys gfxinfo` total-frames counter, sampled as
  a per-interval delta, so it reads real on-screen frame rate (0 when idle)
- **Battery** (level, status, health, temperature, voltage, technology, power)
- **Network** (type, SSID, IP, signal, link speed, throughput)
- **Storage** for `/data`, and **System** (uptime, load average, sample count)

### Memory

Snapshot and dump process memory, and save it to your computer.

- **Process picker**: filterable, sorted by RSS. Selecting a process loads its
  `dumpsys meminfo` immediately
- **Snapshot**: re-read the full `dumpsys meminfo` breakdown
- **Maps**: the process's `/proc/<pid>/maps` address space
- **Capture memory → PC**: one button that always produces something. It tries
  `am dumpheap` for a real `.hprof` (Android Studio / MAT), and if the app is a
  release build it **falls back automatically** to an ELF core dump
- **Force core dump**: skips the hprof attempt and goes straight to the core.
  Reads the process's readable memory from
  `/proc/<pid>/mem` and packages it as an **ELF core dump**, so it opens
  directly in gdb, LLDB, radare2 or Ghidra. Works on **any** process, including
  release apps that `am dumpheap` refuses. Filter regions by name (`dalvik`,
  `libxul`, `[anon]`, …) and cap the total size

  ```bash
  gdb -c com.example-1234.core     # or:  r2 com.example-1234.core
  ```

  Each region becomes a `PT_LOAD` at its real virtual address with its true
  permissions, and an `NT_FILE` note labels regions with the library backing
  them. Regions the kernel refuses are skipped rather than silently shifting
  every later offset
- **Save .txt** for any snapshot

**About heap dumps.** This is the least reliable feature here, because Android
fights it. `am dumpheap` doesn't write the file itself. It hands the *target app* a
file descriptor and the app writes it. So it only succeeds when that app
cooperates. Loupe works around the common obstacles: it captures stderr (the ADB `exec:`
service carries stdout only, which is why failures used to be silent), treats
`am`'s `File: <path>` reply as the acceptance it is, waits up to three minutes
for the write to finish (a large heap starts at 0 bytes and grows slowly), tries
the app's data dir before `/data/local/tmp` and `/sdcard`, and tries both the pid
and the process name. Progress is shown live, and if every attempt fails it
reports exactly what each one said.

**`am dumpheap` only works on debuggable (development) builds.** For a release
app it accepts the request and then the VM writes nothing. Loupe checks the
package's `DEBUGGABLE` flag up front rather than waiting to find out, and if the
app is a release build it switches straight to the ELF core path. With root,
`/proc/<pid>/mem` needs no cooperation from the app. So **Capture memory** works
on every process; only the output format changes.
### Inspector

- **View hierarchy** via `uiautomator dump`, parsed into a tree
- Indented, with class, resource-id and text
- Per-node attributes: class, resource-id, text, content-desc, bounds,
  clickable, focusable, enabled, package, depth

### Settings

Read and edit the Android settings providers.

- **Namespaces**: `system`, `secure`, `global`, read with `settings list <ns>`
- **Filter** by key or value
- Pick a key to load it into the editor, then **Set** (`settings put <ns> <key>
  <value>`, single-quoted so spaces and metacharacters stay literal) or **Delete**
  (`settings delete`). Some secure/global keys are protected and reject a write

### Device Info

Live `getprop`, grouped into cards (device, OS, hardware, security, transport).

- **Filter** by property name or value
- **Reload** to re-read `getprop`
- **Copy all** as `group.key=value` lines
- The transport card reflects how you're connected (WebUSB or the Wi-Fi bridge)

### Files

A working file manager for the device.

- **Browse** the filesystem via the ADB sync service, with breadcrumbs and up
- **Search**: type to filter the current folder instantly, or press **Enter** to
  run a recursive `find` from where you are. Results show filename and parent
  path; clicking a folder opens it, clicking a file opens its folder and
  previews it. Root-aware, so it reaches `/data/data` when elevated
- **Preview pane**, picked by file type:
  - Images (`.png/.jpg/.gif/.webp/.svg/…`) render inline and fit the pane
  - Text and config (`.txt/.xml/.json/.log/.js/.smali/.sql/.yaml/…`) render as text
  - HTML renders in a locked-down iframe (scripts disabled) with a **Source** toggle
  - PDFs open in the browser's own viewer
  - Audio and video (`.mp3/.wav/.mp4/.webm/…`) get inline players
  - SQLite databases (`.db/.sqlite`, or any file whose header says so) open a
    table browser: a tab per table, the first 200 rows in a grid, with row counts
  - Anything else shows its size and a Download hint
- **Download** files from the device to your computer
- **Upload** files from your computer to the device (multi-file, with progress)
- **Copy / Cut / Paste** across directories
- **Delete** (with confirmation) and **New folder**
- Reads are capped by type (16 MB images, 512 KB text, 64 MB media/databases) so
  a huge file can't lock the tab; downloads are uncapped

### Apps

- **List packages**: user, system, or all, searchable, sorted by name
- **Launcher icon and a readable name** per row. The name is derived from the
  package (`friendlyName` in `ui.jsx`), since ADB can't read the real label
  without `aapt`. The icon is the real one: `loadAppIcons` pulls the
  highest-density raster `ic_launcher` out of each APK with `unzip`, base64s it,
  and hands the row a data URL; apps whose icon is vector-only fall back to a
  colour-keyed letter badge
- **Details pane** from `dumpsys package`: version, versionCode, min/target SDK,
  userId, data dir, APK path, install and update times, and the full
  permission list
- **Install APK** from your computer: pushes it, runs `pm install -r`, and
  cleans up the temp file
- **Per-app actions** in the details header: **launch** and **force-stop** from
  the row; **enable/disable** (`pm enable` / `pm disable-user`; one toggle whose
  label follows the app's current `enabled=` state from `dumpsys`), **clear data**
  (`pm clear`), **clear cache** (root-only `rm -rf` of the app's cache dirs, since
  no `pm` command clears cache alone), **uninstall**, and **jump to its data dir**
  in Files

### Processes

- Live process table from `ps -A`: PID, app name, package (process name), CPU, RSS
- **Click any column header to sort**; the arrow shows the direction. Defaults to
  PID descending on connect. Filter by name or PID
- **force-stop** and **kill**

### Shell

- A real `adb shell`: run any command, see real output
- **Prompt** reflects privilege: `#` when the elevated (`su`) shell is on, `$` when it isn't
- **Command history** with ↑ / ↓
- `clear` to reset
- Doubles as the log for connect traces, APK installs and mirror startup

### Frida

Installs, runs, and stops `frida-server` on the device, with no manual `adb push`.

- **Detects** whether `frida-server` is running (with its PID) and which version
  is installed
- **Download + install**: fetches the **latest** `frida-server` release for the
  device's ABI, decompresses it, and pushes it to `/data/local/tmp`, all through
  the Node bridge, since the browser can't reach GitHub's release assets or
  unpack `.xz`. Re-runs as **Update to latest** once one is installed
- **Start / Stop** the server (start needs root, to ptrace other processes)
- **Script editor** (CodeMirror, with JavaScript highlighting and line numbers)
  starting from a `Java.perform` template. Paste a link in place of a script and
  Run fetches it: `resolveScript`
  in `proxy/frida.js` normalises a Frida CodeShare project
  (`codeshare.frida.re/@user/project` → its `api/project/user/project/` JSON
  `source`), a GitHub file (`/blob/` → `raw.githubusercontent.com`), or a
  single-file Gist (via the Gist API), and rejects a repo, folder, or multi-file
  Gist with a clear message. The browser sends it a bare URL only when the editor
  holds one token; anything with whitespace is treated as the script itself
- **Run the script from the browser**: pick a target app from the dropdown (sorted
  by name, with icons; tick **spawn** to launch the app fresh instead of
  attaching), press **Run**, and the script's `console.log` and `send()` stream
  into the log live. frida-node runs in the Node bridge and reaches `frida-server`
  over a tunnel through the browser's own device connection (see
  [Reaching frida-server](#reaching-frida-server-usb-and-wi-fi)), so it needs no
  `frida` CLI and works on USB and Wi-Fi alike
- **Server & script log** with auto-scroll: install, start and run steps, then
  live script output

#### Pre-17 script compatibility

Frida 17 moved the language bridges out of the agent runtime and dropped several
long-deprecated globals, so scripts written for Frida 16 and earlier (the bulk of
what is on codeshare.frida.re) fail on load. `withBridge()` in `proxy/frida.js`
prepends just the shims a given script needs before handing the source to
`createScript`:

- **`Java`**: restored from `frida-java-bridge`, compiled by `frida-compile` and
  esbuild into `proxy/agent/bridge-prelude.js`. Rebuild with
  `npm run build:frida-bridge` after bumping the bridge. Source entry:
  `proxy/agent/bridge-entry.js`. This is the only heavy shim (~1900 lines, because
  the bridge embeds C source), so it is only prepended when the script uses the
  `Java` global.
- **`Module.findExportByName` / `getExportByName` / `findBaseAddress` /
  `getBaseAddress`**: one-line forwarders onto the surviving
  `Module.getGlobalExportByName` / `Process.getModuleByName` APIs.
- **`Memory.readX` / `Memory.writeX`**: one-line generator that re-creates the
  old helpers as forwarders onto the `NativePointer` read/write methods.

Each shim is gated on a regex so a script pays only for what it uses, and error
line numbers reported back to the panel are shifted by the prelude's line count
so they match what the author wrote. `frida-compile`, `frida-java-bridge`, and
`esbuild` are dev-only; the built prelude is committed, so runtime needs none of
them.

#### Reaching frida-server (USB and Wi-Fi)

frida-node runs in the proxy, but the proxy has no path to the device;
frida-server listens only on the device's own loopback. Rather than `adb
forward` (which needs the host adb server, and the host adb can't claim the USB
interface the browser's WebUSB session already holds), the run WebSocket
carries a tunnel:

- The browser opens an ADB socket to `tcp:27042` with `openTcpSocket` in
  `webadb.js` (`Adb.createSocket`, which goes through the live transport, so it
  works over USB and Wi-Fi alike).
- `runSession` in `proxy/frida.js` listens on a local port and hands
  `127.0.0.1:<port>` to `frida.addRemoteDevice`. When frida-node connects, the
  proxy relays that connection to the browser as WebSocket **binary** frames.
- The browser pumps those bytes into the ADB socket and streams frida-server's
  replies back. **Text** frames on the same socket stay JSON control (the run
  request in; logs, messages, and status out).

So Frida needs no host `adb` at all, and works on whichever transport the app is
already using. One socket is one run; closing it unloads the script and drops
the tunnel.

---

## What it can't do

- **Wi-Fi needs the Node bridge and `adb` installed.** The browser itself still
  can't do TCP/mDNS/TLS; wireless works because Node does it (see
  [Over Wi-Fi](#over-wi-fi)). USB needs neither.
- **USB and Wi-Fi can't be live at once.** The host adb server claims USB.
- **HTTPS interception needs your own proxy, plus the CA.** The Proxy panel points
  the device at Burp/HTTP Toolkit and can install that proxy's CA into the system
  store (root-only; a persistent boot module on Magisk/KernelSU, otherwise until
  reboot). Pinned apps need their own unpinning — run it yourself in the Frida tab
  (e.g. paste a script link); Loupe no longer bundles one, since no single script
  works for every app.
- **`/data/data/...` needs root.** On an unrooted phone these stay unreadable.
  With root, Loupe routes around the sync service. See [Root mode](#root-mode).
- **Heap dumps need a debuggable app or root**; `/proc/<pid>/maps` for other
  processes needs root. Both work once root mode is on.
- **Frida needs `xz` on the host** (for install) and can't decrypt what a
  script doesn't expose. Installing, running scripts, and streaming their output
  all work in-browser through the bridge (via frida-node); an interactive REPL is
  still the `frida` CLI's job.

## Security model

Loupe hands out real shell on an attached phone, so it matters who can reach it.
Every `/__loupe/*` endpoint is gated two ways:

- **Loopback only.** Requests from any other host get `403`, so nobody else on
  your network can list devices, pair, or open a shell.
- **Origin allow-list** (`localhost:5173`, `localhost:4173`). Loopback alone is
  not enough, because any page in your browser can reach localhost. CORS does not
  cover it either: WebSockets ignore CORS, and the ADB service relay is a
  WebSocket. Without this check, any site you had open could shell into your phone.

Both gates apply to every endpoint (the ADB relay, the Frida tunnel, cert prep),
since each reaches the device on your behalf.

Serving the UI from a different port means the bridge will reject it. Add that
origin to `ALLOWED_ORIGINS` in `proxy/adb-bridge.js`.

Installing a proxy CA is powerful, so it is an explicit, one-off action you
trigger, never automatic: it is root-only, and dumps land in your browser's
downloads only when you ask for them.

## Architecture

```
index.html            Vite entry
vite.config.js        dev server + starts the Loupe bridge
proxy/server.js       Node bridge: the loopback /__loupe API + access gate
proxy/adb-bridge.js   wireless ADB: pair/connect/mDNS + service relay, access gate
proxy/frida.js        latest frida-server for the ABI + runs scripts via frida-node
proxy/cert.js         turns an uploaded proxy CA into PEM + the Android hash name
public/
  scrcpy-server.bin   official scrcpy 3.3.3 server, pushed to the device
src/
  main.jsx            mounts <App>
  App.jsx             layout, resizable split, tab wiring
  store.jsx           reducer store + all actions, via useLoupe()
  styles.css          design tokens (dark + light) and shared classes
  lib/
    webadb.js         ALL ADB I/O: connect, shell, sync, packages, root, heap, /proc mem
    scrcpy.js         mirroring + input injection
    record.js         mirror screen recording (MediaRecorder)
    elfcore.js        builds ELF core dumps from captured regions
    wireless.js       AdbTransport over the bridge (Wi-Fi devices)
    sqlite.js         reads SQLite databases for preview (sql.js, loaded on demand)
  components/
    Header.jsx        device picker, connect/disconnect, root, refresh, theme
    Mirror.jsx        mirror canvas, tool keys, device info
    PanelSlot.jsx     draggable tab strip, collapse/maximise
    ErrorBoundary.jsx surfaces runtime errors instead of a blank page
    panels/           DeviceInfo, Logcat, Sockets, Proxy, Perf, Memory,
                      Inspector, Settings, Files, Apps, Procs, Shell, Frida
```

Two files hold all device I/O: `src/lib/webadb.js` and `src/lib/scrcpy.js`.
Everything else is UI on top of them.

> **Note:** the Network panel's file is `Sockets.jsx`, not `Traffic.jsx`. Ad and
> privacy blockers match filenames like `Traffic`/`Capture` and block the module,
> which blanks the whole app.

### Why a bundler

ya-webadb requires a **single shared copy** of its internal `@yume-chan/*`
packages; mismatched copies make the ADB handshake fail silently. npm plus the
lockfile guarantees one deduped copy, which loading the packages separately from a
CDN could not do reliably.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `env: node: No such file or directory` | No active nvm version. Run `nvm use` (or `nvm alias default v24.20.0`). A stale `/usr/local/bin/npm` can shadow nvm's. |
| Blank white page | A blocker extension blocked a module (`ERR_BLOCKED_BY_CLIENT` in the console), or you're on a dead port. The app is on **5173**. |
| Connect stalls at `authenticating…` | Accept **Allow USB debugging** on the phone. No prompt? Revoke USB debugging authorisations, replug, retry. |
| Connect fails claiming the interface | A desktop adb server owns the device. Run `adb kill-server`, then replug. |
| `Invalid hook call` in dev | Stale Vite dep cache. Hard-reload, or `rm -rf node_modules/.vite`. |
| `/data/data` still unreadable on a rooted phone | Check the header reads `# root`. If `su` prompts on the device, grant Loupe's shell root in your superuser app, then toggle it. |
| Capture produced a `.core` instead of `.hprof` | Expected on release builds. `am dumpheap` only works on debuggable apps, so Loupe fell back automatically. Open the core in gdb/radare2/Ghidra. |
| Heap dump seems stuck | Large heaps take a while. The panel streams `writing… N MB`. It waits up to 3 minutes before giving up. |
| Wi-Fi tab does nothing | Needs `adb` on PATH and the bridge running (`npm run dev`). |
| Paired but device won't connect | Pairing and connect use *different* ports. Loupe finds the connect port via `adb mdns services`; if mDNS is blocked on your network, use the **Connect** tab with `<ip>:5555`. |
| USB stopped working after using Wi-Fi | The adb server claimed it. Press **Stop adb server (free USB)**, then reconnect over USB. |
| Want to switch phones, or move a phone from USB to Wi-Fi | Press **Disconnect** in the header first. Only one transport is live at a time, and disconnecting clears the previous device's panel state. |
| Proxy set but no traffic reaches Burp | Your proxy must listen on all interfaces (bind `0.0.0.0`), not just `127.0.0.1`, so the phone can reach it. |
| CA install fails or HTTPS still won't decrypt | The system-store install needs root. Without Magisk/KernelSU it resets on reboot. Pinned apps also need SSL unpinning — run a script yourself in the Frida tab. |
| `403 forbidden` from the bridge, or the Wi-Fi panel sees no devices | The `/__loupe` API is loopback-only and origin-checked. Reaching it from another machine is refused by design; serving the UI on a port other than 5173/4173 needs that origin added to `ALLOWED_ORIGINS` in `proxy/adb-bridge.js`. |
| Mirror won't start | Needs WebCodecs H.264. The Shell shows which step failed. |
