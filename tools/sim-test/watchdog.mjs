// Hang watchdog. Preloaded by run.mjs (node --import). A worker thread watches
// for output silence; when the main thread prints nothing for SIM_HANG_MS it
// pauses the main thread through the inspector, prints WHERE it is stuck
// (top stack frames) and the last line printed, then kills the process (run.mjs reports exit 4). A fake clock
// cannot defeat it (the worker uses real timers). SIM_HANG_MS=0 disables.
import { Worker, isMainThread, workerData } from 'node:worker_threads';
import inspector from 'node:inspector';
import fs from 'node:fs';

if (isMainThread) {
  const ms = Number(process.env.SIM_HANG_MS ?? 20000);
  if (ms > 0) {
    const beat = new Int32Array(new SharedArrayBuffer(8));   // [0] = last output seconds, [1] unused
    const stamp = () => Atomics.store(beat, 0, Math.floor(Date.now() / 1000) % 2000000000);
    stamp();
    let last = '';
    for (const s of [process.stdout, process.stderr]) {
      const w = s.write.bind(s);
      s.write = (chunk, ...a) => { stamp(); const t = String(chunk).trim(); if (t) last = t.split('\n').pop().slice(0, 160); return w(chunk, ...a); };
    }
    globalThis.__watchdogLast = () => last;
    const wk = new Worker(new URL(import.meta.url), { workerData: { beat: beat.buffer, ms }, stderrCapture: false });
    wk.unref();
  }
} else {
  const beat = new Int32Array(workerData.beat);
  const limit = Math.max(1, Math.round(workerData.ms / 1000));
  // Connect and enable the debugger NOW, while the main thread can still answer: against an
  // already-spinning main thread Debugger.enable never completes and Debugger.pause is ignored.
  const s = new inspector.Session();
  s.connectToMainThread();
  const urls = new Map();
  s.on('Debugger.scriptParsed', (m) => urls.set(m.params.scriptId, m.params.url));
  s.post('Debugger.enable');
  const t = setInterval(() => {
    const idle = Math.floor(Date.now() / 1000) % 2000000000 - Atomics.load(beat, 0);
    if (idle < limit) return;
    clearInterval(t);
    s.on('Debugger.paused', (m) => {
      const fr = m.params.callFrames.map((f) => ({ ...f, url: urls.get(f.location.scriptId) || '' })).filter((f) => f.url && !f.url.startsWith('node:')).slice(0, 6);
      const lines = fr.length ? fr.map((f) => `  at ${f.functionName || '(anonymous)'} ${f.url.split('/').slice(-2).join('/')}:${f.location.lineNumber + 1}`)
        : ['  (main thread is idle: waiting on a timer, promise or event that never fires)'];
      fs.writeSync(2, `HANG: no output for ${idle}s (budget ${limit}s). Stuck in:\n${lines.join('\n')}\nSIM_HANG_MS=<ms> raises the budget, 0 disables.\n`);
      process.kill(process.pid, 'SIGKILL');   // a worker's process.exit() ends only the worker
    });
    // Empirical (node 24): the pause request is silently ignored unless the worker has touched its
    // console first (any console call, even an empty one). Do not remove without rerunning look-kit-check.
    console.error('');
    s.post('Debugger.pause');
  }, 500);
}
