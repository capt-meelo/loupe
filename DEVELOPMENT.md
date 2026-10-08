# Loupe: Internal Reference (Development Notes)

> **This is the internal, full-detail reference for Loupe, kept for the developer
> working in this repo.** It covers architecture, the security model,
> the connection internals, and troubleshooting. The public, GitHub-facing
> README lives in [`README.md`](README.md) and is deliberately short: what the app
> is, its features, and how to run it. Keep deep or sensitive detail here, not there.

---


**A browser-based Android control hub.** Live logcat, an adb shell, a file
manager, package management, process and memory inspection, proxy interception, an
interactive screen mirror, and an APK decompiler (jadx). Over USB it needs no host `adb`
server, no drivers, and no agent app on the device. Over Wi-Fi it uses the host `adb`
tools for pairing, discovery, and transport.

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
- [Decompiler](#decompiler)
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
| **Decompiler** | Nothing to install. Loupe downloads Java and jadx on first use, after a click. macOS and Linux only. |
| **`adb`** | Only for Wi-Fi: pairing, mDNS discovery, and transport go through the host binary |
| **`xz`** | Only for Frida install; the bridge unpacks the `.xz` server with it (`brew install xz`). Not bundled with Windows |
| **`openssl`** | Only for the proxy CA step; the bridge converts the uploaded certificate with it. Not bundled with Windows |
| **`bubblewrap`** | Linux decompiler only; macOS uses its built-in `sandbox-exec` |
| **Root** | Optional. Needed for system CA install, starting `frida-server`, `/data/data`, and other processes' memory |
| **Network** | One-time downloads from the internet: Java and jadx (decompiler) and `frida-server` (from GitHub) |

## Quick start

```bash
nvm use            # picks up .nvmrc
npm install
npm run dev
```

Open <http://localhost:5173>. This also starts the Loupe bridge on port `8090`
(the loopback `/__loupe/*` API for ADB, Frida, cert preparation, and the decompiler),
and Vite proxies `/__loupe` to it so the page only ever talks to its own origin.

```bash
npm run build      # production bundle into dist/
npm run preview    # serve the built UI only (no bridge)
npm run proxy      # run the Loupe bridge on its own (port 8080 unless you pass one)
```

`npm run preview` serves the static UI on port 4173 with nothing behind `/__loupe`, so
Wi-Fi, Frida, Proxy, and the Decompiler can't reach a bridge there. `npm run proxy`
(`proxy/server.js`) listens on 8080 by default, which is also Burp's default port, so
pass a different one (`node proxy/server.js 8090`). The page only calls same-origin
`/__loupe/*`, and `/__loupe/session` refuses cross-origin requests, so a standalone
bridge works only behind a reverse proxy that serves it on the UI's origin. For normal
use, run `npm run dev`.

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
implements ya-webadb's `AdbTransport` against that relay, so the same features work
over Wi-Fi: shell, files, logcat, scrcpy mirroring, and memory.

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

- **Disconnect** in the device bar, right of the device name. It asks for
  confirmation first.
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

Screen mirroring over scrcpy, with touch and key injection.

- **Live H.264 mirror**: the official scrcpy 3.3.3 server is pushed to the
  device, started over ADB, and decoded in-browser with WebCodecs
- **Sizes to the device**: the canvas matches your phone's actual aspect ratio,
  so there are no letterbox gutters
- **Touch, drag, swipe and scroll**: pointer down/move/up are injected as real
  touch events, mapped to device coordinates
- **Hardware keys**: Power, Volume ±, Back, Home, Recents, Menu
- **Notification shade**, **Wake screen**, **Rotate**
- **Screenshot**: saves a PNG **to your computer** and tries to copy it to the
  clipboard (the copy can fail on browser permissions even though the file saved).
  Uses the decoded mirror frame when mirroring, otherwise runs `screencap` on the
  device, pulls the image back and deletes the temp file
- **Screen recording**: records the live mirror and prompts you to save it,
  in the first format the browser's MediaRecorder supports (VP9 WebM, VP8 WebM,
  plain WebM, then MP4). No 3-minute cap, unlike the device's own `screenrecord`. The
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
  flag. Test connection opens a raw TCP connect from the bridge to the proxy
  (`/__loupe/proxy/test`), so it shows that this computer can reach the proxy. It
  does not test the phone's route to it. The host defaults to this machine's LAN
  address; your proxy must listen on all interfaces, and the phone must be able to
  reach that address, for traffic to arrive
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
  a per-interval delta, so it reads the on-screen frame rate (0 when idle)
- **Battery** (level, status, health, temperature, voltage, technology, power)
- **Network** (type, SSID, IP, signal, link speed, throughput)
- **Storage** for `/data`, and **System** (uptime, load average, sample count)

### Memory

Snapshot and dump process memory, and save it to your computer.

- **Process picker**: filterable, sorted by RSS. Selecting a process loads its
  `dumpsys meminfo` immediately
- **Snapshot**: re-read the full `dumpsys meminfo` breakdown
- **Maps**: the process's `/proc/<pid>/maps` address space
- **Capture memory → PC**: one button that falls back between formats. It tries
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
- Reads are capped by type so a huge file can't lock the tab: images 16 MiB,
  PDFs 32 MiB, audio, video and SQLite 64 MiB, HTML 2 MiB, text 512 KiB. Downloads
  are capped at 512 MiB, and a larger file is cut off at the cap

### Apps

- **List packages**: user, system, or all, searchable, sorted by name
- **Launcher icon and a name** per row. The name is derived from the package
  (`friendlyName` in `ui.jsx`), since ADB can't read the real label without `aapt`.
  The icon is best effort: `loadAppIcons` pulls the highest-density raster
  `ic_launcher` out of the first 80 packages' APKs with `unzip`, base64s it, and
  hands the row a data URL. Apps whose icon is vector-only, or beyond the first 80,
  show a colour-keyed letter badge
- **Details pane** from `dumpsys package`: version, versionCode, min/target SDK,
  userId, data dir, APK path, install and update times, and the full
  permission list
- **Install APK** from your computer: pushes it, runs `pm install -r`, and
  cleans up the temp file. Two Android blocks get an in-app prompt (`Dialogs.jsx`):
  - **Play Protect hold.** `pm install` waits on Play Protect's dialog on the phone
    and returns no error. While an install runs, `installApk` polls the focused window
    (`dumpsys window`) and, when it sees `PlayProtectDialogsActivity`, asks. **Install
    anyway** sets `verifier_verify_adb_installs=0`, stops the waiting `pm`, and
    installs again. **Cancel install** stops it and sends the phone HOME. The setting
    stays at 0 afterwards, so installs over adb are no longer scanned until you set it
    back to 1 (Settings tab, `global`, or `settings put global verifier_verify_adb_installs 1`).
  - **Old target SDK.** Android 14+ can refuse an app built for an old Android
    (`INSTALL_FAILED_DEPRECATED_SDK_VERSION`). **Install anyway** retries with
    `--bypass-low-target-sdk-block`, which needs Android 14 or later.
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

- An `adb shell`: run any command and see its output
- **Prompt** reflects privilege: `#` when the elevated (`su`) shell is on, `$` when it isn't
- **Command history** with ↑ / ↓
- `clear` to reset
- Doubles as the log for connect traces, APK installs and mirror startup

### Frida

Installs, runs, and stops `frida-server` on the device, with no manual `adb push`.

- **Detects** whether `frida-server` is running (with its PID) and which version
  is installed
- **Download + install**: fetches the `frida-server` release that **matches
  Loupe's installed `frida` client** (the version in `node_modules`) for the
  device's ABI, decompresses it, and pushes it to `/data/local/tmp`, all through
  the Node bridge, since the browser can't reach GitHub's release assets or
  unpack `.xz`. Re-runs as **Reinstall matching server** once one is installed. A
  server from a different release can connect and then hang on spawn or crash the
  agent inside the target app, so Loupe never installs a newer one by default
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
  reboot). Pinned apps need their own unpinning: run a script yourself in the Frida
  tab (for example by pasting a script link). Loupe bundles none, because no single
  script works for every app.
- **`/data/data/...` needs root.** On an unrooted phone these stay unreadable.
  With root, Loupe routes around the sync service. See [Root mode](#root-mode).
- **Heap dumps need a debuggable app or root**; `/proc/<pid>/maps` for other
  processes needs root. Both work once root mode is on.
- **Frida needs `xz` on the host** (for install, and on Windows it isn't bundled) and can't decrypt what a
  script doesn't expose. Installing, running scripts, and streaming their output
  all work in-browser through the bridge (via frida-node); an interactive REPL is
  still the `frida` CLI's job.

## Decompiler

A second full-window view, switched from the header (`Console | Decompiler`) and loaded
lazily. It opens an APK from disk, drag-and-drop, the connected phone (**decompile** in
Apps), or **Decompile** on an `.apk` in Files, and reads it like jadx-gui: decompiled
Java, the decoded manifest and resources, a source tree, and search across everything.

### Setup

The first time you open an APK, Loupe asks once before downloading a Java runtime
(Temurin 21) and jadx 1.5.0 into `~/.loupe/tools` (about 140 MB), then decompiles the
APK by itself. Both downloads are pinned by SHA-256 in `proxy/toolchain-manifest.json`.
Loupe unpacks them with its own code (`tar.js`, `zipfile.js`, no external `tar` or
`unzip`), proves they run, and publishes them atomically. It installs nothing
system-wide and fetches nothing without the click. `LOUPE_JAVA` and `LOUPE_JADX_JAR`
point it at your own Java and jadx instead.

### What you get

- **Dashboard.** With no project open, the view shows a drop box (click it to browse)
  above a **Recent scans** table with search and sort. Each row has the app icon and
  name, package, version, SDK range, MD5, APK size, and a relative scan time (exact time
  on hover). Click a row to reopen it, the copy icons copy the package or MD5, and the
  red trash icon deletes the cache entry. **‹ Scans** in the toolbar returns here from
  an open project. The facts come from the decoded manifest and resources
  (`manifestFacts` in `proxy/jadx.js`); the MD5 is computed at upload, and older scans
  get it filled in the first time the table loads.
- **Source tree** with single-child packages folded, file-type icons, a filter box (it
  matches what is already loaded; use Search for everything), and a themed editor with
  document tabs and a copyable path.
- **Search** over code, resources, and the manifest (regex, case, whole word). Click a
  hit to jump to it with the match highlighted. `Ctrl/Cmd+Shift+F` opens it.
- **Deobf** button (green when on): jadx's own deobfuscator, with the minimum and
  maximum name length and the use-source-name option. Each combination is cached as its
  own decompile.
- **Info** tab: manifest facts in groups (identity, SDK, build, security flags, signature) plus signature verdicts for v1, v2, v3, and v3.1,
  checked with Google's apksig library, which the jadx jar already bundles, so there is
  no extra download. `proxy/apk/Verify.class` (source in `Verify.java`; recompile with
  `javac --release 17 -cp <jadx-all.jar> -d proxy/apk proxy/apk/Verify.java`) calls it and
  prints JSON. It runs in the same sandbox as jadx and the result is cached per scan. The
  tests check it against the signed and tampered APKs in `proxy/fixtures`.
- **Binary files** open as a hex dump of the first 64 KB. Images preview inline. Text
  files over 2 MB are refused.

### How it runs

`proxy/jadx.js` takes the upload through a zip preflight (`zipfile.js`: entry count,
declared size, per-entry size, unsafe names). There is no compression-ratio check,
because real native libraries compress 200:1. Then it runs a job: one at a time,
single-flight per cache key, reference-counted cancel, a timeout, and an output cap.

The cache key hashes the jadx version, the exact flags, and the APK parts, so changed
options never serve stale output. A job is published only when jadx exits 0. jadx
returns 0 even when some classes failed and logs "finished with errors"; that count only
marks the result partial. Any other exit, a signal, a timeout, or output over the cap
never reaches the cache, and log text is never trusted to turn a failure into a success.

Output lives in `~/.loupe/decompiled` (LRU, 10 GB; `LOUPE_HOME` moves it). Search runs in
a worker thread that streams files, limited by query length, results, files, and time.

### Limits and storage

APK upload is capped at 1 GiB, decompiled output at 4 GiB per job, a job at 30 minutes
(`LOUPE_JADX_TIMEOUT_MS` changes it), and the cache at 10 GiB (LRU). A decompiled text
file over 2 MB is refused. `LOUPE_HOME` moves everything, but full decompiles are
rejected when its path contains whitespace (the JVM options are space-separated), with
the message "Full decompile needs LOUPE_HOME without spaces".

### Hostile input

The APK and its output are untrusted. The file API never follows symlinks and never
serves output as HTML. jadx runs in `proxy/sandbox.js` with no network, file reads denied
by default, and writes only to the job dir. On macOS only the job, the toolchain, the
root directory, and `/System` are readable, through `sandbox-exec`. On Linux it uses
bubblewrap with a deny-by-default filesystem. JVM limits (`-Xmx`, temp and home dirs) go
in argv so they hold under bwrap's `--clearenv`.

Before the first run, `selfTest` starts a probe in the sandbox and checks that it cannot
read canaries (one in `/var/tmp`, a path no rule names) or reach the network. If it
cannot, the decompiler stays off, with no override.

### Platforms

macOS is tested, and Linux has run under WSL2 (Ubuntu, bubblewrap sandbox, `npm test` 64 pass). Linux needs `bwrap` and permitted
user namespaces, which some distros restrict, and the self-test turns the decompiler
off with the reason shown. Windows has no sandbox available to Node, so the decompiler
is unavailable there. The rest of Loupe is unaffected.

### Not built

Method-level find-usages, ProGuard `mapping.txt` import, rename, smali, source export,
and links from the Inspector and Logcat.

### Tests

`npm test`. The real-jadx tests need the toolchain (`LOUPE_TOOLS` pointing at an
installed one, which also enables the signature tests, or `LOUPE_TEST_INSTALL=1` to download it) and skip otherwise.

## Security model

Loupe gives shell access to an attached phone, so it matters who can reach it.
Every `/__loupe/*` request must pass these checks:

- **Loopback only.** Requests from any other host get `403`, so nobody else on
  your network can list devices, pair, or open a shell.
- **Origin allow-list** (`localhost:5173`, `localhost:4173`). Loopback alone is
  not enough, because any page in your browser can reach localhost. CORS does not
  cover it either: WebSockets ignore CORS, and the ADB service relay is a
  WebSocket. Without this check, any site you had open could shell into your phone.
- **Host check.** `Host` must be `localhost`, `127.0.0.1` or `[::1]`, which blunts
  DNS rebinding.
- **Per-launch token.** `accessOk` lets requests with no `Origin` through, and the
  bridge binds `0.0.0.0`, so every request except the session request also needs a
  random token the bridge generates at startup. The page gets it from
  `/__loupe/session`, keeps it in memory, and sends it as `Authorization: Bearer`
  (fetch) or a `loupe.<token>` WebSocket subprotocol. See `proxy/auth.js` and
  `src/lib/bridge.js`. Restarting the bridge rotates it; the page re-fetches on `401`.

`/__loupe/session` is the one exception to the token check, because it is what issues
the token. It answers only same-origin browser requests (it requires
`Sec-Fetch-Site: same-origin`), on top of the loopback, origin, and Host checks. Every
other endpoint (the ADB relay, the Frida tunnel, cert prep, the decompiler) needs all
four, since each reaches the device or your files on your behalf. `npm test` attacks
them (forged Origin and Host, missing token, WebSocket without a token).

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
proxy/auth.js         per-launch token + Host check
proxy/jadx.js         decompiler job runner and API (sandbox.js, toolchain.js, zipfile.js, tar.js, jadx-search.js)
proxy/apk/            apksig launcher (Verify.class) for the signature check
proxy/adb-bridge.js   wireless ADB: pair/connect/mDNS + service relay, access gate
proxy/frida.js        frida-server matching the bundled client + runs scripts via frida-node
proxy/cert.js         turns an uploaded proxy CA into PEM + the Android hash name
public/
  scrcpy-server.bin   official scrcpy 3.3.3 server, pushed to the device
  favicon.svg         browser tab icon (the logo mark)
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
    bridge.js         fetch and WebSocket helpers that attach the bridge token
    jadx.js           client API for the decompiler routes
  components/
    Header.jsx        global bar (logo, Console/Decompiler, theme) and the device bar (picker, disconnect, root, refresh, reboot)
    Mirror.jsx        mirror canvas, tool keys, device info
    Decompiler.jsx    decompiler view: dashboard, toolbar, editor tabs
    JxPanels.jsx      decompiler search, APK info, tree, recent scans
    CodePane.jsx      CodeMirror viewer with themed highlighting
    PanelSlot.jsx     draggable tab strip, pane menu, collapse/maximise
    Dialogs.jsx       in-app confirm and install prompts (Play Protect, old target SDK)
    ErrorBoundary.jsx surfaces runtime errors instead of a blank page
    panels/           DeviceInfo, Logcat, Sockets, Proxy, Perf, Memory,
                      Inspector, Settings, Files, Apps, Procs, Shell, Frida
```

Most browser-side Android operations go through `src/lib/webadb.js`, with scrcpy
control in `src/lib/scrcpy.js`. Wi-Fi devices reach the same code through the transport
in `src/lib/wireless.js` and the bridge in `proxy/`, which also handles Frida, the proxy
CA, and the decompiler. Everything else is UI on top of these. Pane sizes and the mirror
width are saved in `localStorage` (`loupe.layout`, `loupe.splits`).

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
| CA install fails or HTTPS still won't decrypt | The system-store install needs root. Without Magisk/KernelSU it resets on reboot. Pinned apps also need SSL unpinning, so run a script yourself in the Frida tab. |
| `403 forbidden` from the bridge, or the Wi-Fi panel sees no devices | The `/__loupe` API is loopback-only and origin-checked. Reaching it from another machine is refused by design; serving the UI on a port other than 5173/4173 needs that origin added to `ALLOWED_ORIGINS` in `proxy/adb-bridge.js`. |
| Decompiler says it is unavailable | Windows has no sandbox, or the Linux sandbox self-test failed (the panel shows why; `bwrap` and user namespaces are required). |
| jadx ran out of memory | Raise the heap with `LOUPE_JADX_XMX_MB`. The default is half of RAM, up to 8 GB. |
| Decompiler unavailable on Windows | Expected. Run Loupe inside WSL2 and open it from Windows Chrome (see the README). |
| Wi-Fi pairing or discovery fails inside WSL2 | Ubuntu's apt `adb` (34.0.4) has no mDNS, so QR pairing and connect-port discovery find nothing in any network mode. Use **Pair code**, then **Connect** with the `ip:port` from Wireless debugging. With mirrored networking, `adb start-server` hangs because connects to closed loopback ports are not refused. Loupe starts `adb -L tcp:5037 server nodaemon` itself on Linux. USB (WebUSB) runs in Windows Chrome and does not touch WSL. |
| Mirror won't start | Needs WebCodecs H.264. The Shell shows which step failed. |
| Wi-Fi, Frida, Proxy, or the Decompiler do nothing under `npm run preview` | Preview serves only the static UI. Run `npm run dev`, which also starts the bridge. |
| `Loupe proxy failed to start on 8090` | Something else owns port 8090. Stop it, then restart `npm run dev`. |
| Frida install fails with an `xz` error | The bridge unpacks the server with the host `xz`. Install it (`brew install xz`, or your package manager). |
| CA step fails with an `openssl` error | The bridge converts the certificate with the host `openssl`. Install it or put it on your `PATH`. |
| Frida spawn hangs, or the app dies on attach | The `frida-server` release differs from Loupe's Frida client. Press **Reinstall matching server**. |
| Install stops and a Play Protect dialog is on the phone | Use **Install anyway** in Loupe's prompt, or answer on the phone. See [Apps](#apps). |
| `Full decompile needs LOUPE_HOME without spaces` | Point `LOUPE_HOME` at a path with no spaces. |
| Decompile fails with `timed out` or the output cap | Jobs stop at 30 minutes (`LOUPE_JADX_TIMEOUT_MS`) or 4 GiB of output. The cache holds up to 10 GiB, and Recent scans can delete entries. |
