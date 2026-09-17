/**
 * Screen recording for the mirror.
 *
 * Records the canvas scrcpy decodes into, using MediaRecorder over
 * `canvas.captureStream()`. That captures exactly what you see, has no length
 * cap (unlike the device's own `screenrecord`, which stops at 3 minutes), and
 * produces a file the browser can hand straight to the user.
 */
let recorder = null;
let chunks = [];

export const isRecording = () => !!recorder && recorder.state === 'recording';

/** The best container/codec this browser will actually accept. */
function pickMimeType() {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4'
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export function startRecording(canvas, { fps = 30 } = {}) {
  if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder is not available in this browser.');
  if (!canvas) throw new Error('Start mirroring first: there is nothing to record.');
  if (recorder) throw new Error('Already recording.');

  const stream = canvas.captureStream(fps);
  if (!stream || stream.getVideoTracks().length === 0) {
    throw new Error('Canvas produced no video track: is the mirror running?');
  }

  const mimeType = pickMimeType();
  recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : undefined);
  chunks = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  recorder.start(1000); // emit a chunk each second so long takes stay bounded
  return { mimeType: recorder.mimeType };
}

/** Stops and resolves with the finished Blob (or null if nothing captured). */
export function stopRecording() {
  return new Promise((resolve) => {
    if (!recorder) { resolve(null); return; }
    const rec = recorder;
    const type = rec.mimeType || 'video/webm';
    rec.onstop = () => {
      const blob = chunks.length ? new Blob(chunks, { type }) : null;
      chunks = [];
      recorder = null;
      // Release the capture track so the canvas isn't kept alive by it.
      try { rec.stream.getTracks().forEach((t) => t.stop()); } catch { /* already gone */ }
      resolve(blob);
    };
    try { rec.stop(); } catch { recorder = null; resolve(null); }
  });
}

/** Extension matching whatever container the browser produced. */
export const extensionFor = (mimeType = '') => (mimeType.includes('mp4') ? 'mp4' : 'webm');
