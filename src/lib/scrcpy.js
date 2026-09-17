/**
 * Real screen mirroring + input injection via scrcpy over ADB.
 *
 * The scrcpy server (`public/scrcpy-server.bin`, fetched from the official
 * Genymobile release) is pushed to the device, started through `app_process`,
 * and streams H.264 back over an ADB socket. WebCodecs decodes it into a canvas.
 * The same session carries a control channel, so taps and key events are real.
 */
import { AdbScrcpyClient, AdbScrcpyOptionsLatest } from '@yume-chan/adb-scrcpy';
import {
  DefaultServerPath,
  AndroidKeyEventAction,
  AndroidMotionEventAction,
  AndroidScreenPowerMode,
  ScrcpyPointerId
} from '@yume-chan/scrcpy';
import {
  WebCodecsVideoDecoder,
  WebGLVideoFrameRenderer,
  BitmapVideoFrameRenderer
} from '@yume-chan/scrcpy-decoder-webcodecs';

const SERVER_URL = '/scrcpy-server.bin';

let session = null; // { client, decoder, controller, size, dispose }


function makeRenderer(canvas) {
  try {
    if (WebGLVideoFrameRenderer.isSupported !== false) return new WebGLVideoFrameRenderer(canvas);
  } catch { /* fall through */ }
  return new BitmapVideoFrameRenderer(canvas);
}

/**
 * Starts mirroring into `canvas`. `onSize` fires whenever the stream's
 * dimensions change, so the UI can keep the canvas aspect correct.
 */
export async function startMirror(adb, canvas, { maxSize = 1280, onSize = () => {}, onStep = () => {} } = {}) {
  if (session) await stopMirror();
  if (!WebCodecsVideoDecoder.isSupported) throw new Error('This browser has no WebCodecs H.264 decoder.');

  onStep('fetching scrcpy server…');
  const res = await fetch(SERVER_URL);
  if (!res.ok) throw new Error('scrcpy-server.bin is missing from public/.');

  onStep('pushing server to device…');
  await AdbScrcpyClient.pushServer(adb, res.body);

  onStep('starting scrcpy…');
  const options = new AdbScrcpyOptionsLatest({
    video: true,
    audio: false,      // audio needs Android 11+ and another decoder
    control: true,
    maxSize,
    videoBitRate: 6_000_000,
    logLevel: 'error',
    stayAwake: true
  });

  const client = await AdbScrcpyClient.start(adb, DefaultServerPath, options);

  // The server process is live on the device from here on, so anything that
  // throws below has to close the client or it lingers after we give up.
  let decoder;
  let size;
  try {
    const video = await client.videoStream;
    if (!video) throw new Error('Device returned no video stream.');

    decoder = new WebCodecsVideoDecoder({ codec: video.metadata.codec, renderer: makeRenderer(canvas) });
    size = { width: video.metadata.width || 0, height: video.metadata.height || 0 };
    decoder.sizeChanged(({ width, height }) => {
      size.width = width;
      size.height = height;
      onSize({ width, height });
    });

    video.stream.pipeTo(decoder.writable).catch(() => { /* ends when we stop */ });
  } catch (e) {
    try { decoder?.dispose(); } catch { /* not built yet */ }
    await client.close().catch(() => {});
    throw e;
  }

  session = { client, decoder, controller: client.controller, size };
  onStep('mirroring');
  onSize(size);
  return { width: size.width, height: size.height };
}

export async function stopMirror() {
  const s = session;
  session = null;
  movePending = false;
  if (!s) return;
  try { s.decoder.dispose(); } catch { /* already gone */ }
  try { await s.client.close(); } catch { /* already gone */ }
}

/**
 * Builds one touch message. The struct field names are `videoWidth`/`videoHeight`
 * (the dimensions of the encoded stream) — not screenWidth/screenHeight; getting
 * those wrong serialises them as 0 and the device silently drops the event.
 */
function touchMessage(action, nx, ny, pressure) {
  const { width, height } = session.size;
  if (!width || !height) throw new Error('Video size unknown yet: wait for the first frame.');
  return {
    action,
    pointerId: ScrcpyPointerId.Finger, // u64 → BigInt
    pointerX: Math.max(0, Math.min(width - 1, Math.round(nx * width))),
    pointerY: Math.max(0, Math.min(height - 1, Math.round(ny * height))),
    videoWidth: width,
    videoHeight: height,
    pressure,
    actionButton: 0,
    buttons: 0
  };
}

/** Pointer down at normalized coords (0..1 of the mirrored surface). */
export async function pointerDown(nx, ny) {
  if (!session?.controller) throw new Error('Not mirroring.');
  await session.controller.injectTouch(touchMessage(AndroidMotionEventAction.Down, nx, ny, 1));
}

/**
 * Pointer move — drives drags, swipes and scrolling.
 *
 * Mouse moves fire far faster than the control socket drains, so a drag can
 * queue hundreds of messages and stall the session. Only one move is in flight
 * at a time; intermediate positions are coalesced to the latest one.
 */
let movePending = false;
export async function pointerMove(nx, ny) {
  if (!session?.controller || movePending) return;
  movePending = true;
  try {
    await session.controller.injectTouch(touchMessage(AndroidMotionEventAction.Move, nx, ny, 1));
  } finally {
    movePending = false;
  }
}

export async function pointerUp(nx, ny) {
  movePending = false; // never let a dropped move wedge the next gesture
  if (!session?.controller) return;
  await session.controller.injectTouch(touchMessage(AndroidMotionEventAction.Up, nx, ny, 0));
}

/** Presses an Android key (see AndroidKeyCode) as a down/up pair. */
export async function pressKey(keyCode) {
  if (!session?.controller) throw new Error('Not mirroring.');
  // A bad enum lookup yields undefined, which serialises as 0 and is silently
  // ignored by the device — fail loudly instead.
  if (typeof keyCode !== 'number') throw new Error('Unknown key code.');
  await session.controller.injectKeyCode({
    action: AndroidKeyEventAction.Down, keyCode, repeat: 0, metaState: 0
  });
  await session.controller.injectKeyCode({
    action: AndroidKeyEventAction.Up, keyCode, repeat: 0, metaState: 0
  });
}

/** Turns the device screen on or off (scrcpy's own power-mode message). */
export async function setScreenPower(on) {
  if (!session?.controller) throw new Error('Not mirroring.');
  await session.controller.setScreenPowerMode(
    on ? AndroidScreenPowerMode.Normal : AndroidScreenPowerMode.Off
  );
}

export async function injectText(text) {
  if (!session?.controller) throw new Error('Not mirroring.');
  await session.controller.injectText(text);
}

export async function rotateDevice() {
  if (!session?.controller) throw new Error('Not mirroring.');
  await session.controller.rotateDevice();
}

export async function expandNotifications() {
  if (!session?.controller) throw new Error('Not mirroring.');
  await session.controller.expandNotificationPanel();
}

/** PNG blob of the current frame, or undefined if unavailable. */
export async function snapshot() {
  if (!session?.decoder) return undefined;
  return session.decoder.snapshot();
}

export { AndroidKeyCode } from '@yume-chan/scrcpy';
