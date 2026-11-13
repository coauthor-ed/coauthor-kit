/**
 * Drives a staged-generation prompt through Claude Code's headless `-p` mode.
 *
 * The only runner supported by auto-run.mjs right now - Claude Code's `-p` mode
 * is the one harness `tools/staged-generation/README.md` already documents as
 * retrying 429/529s with backoff, and `--output-format stream-json` gives a
 * structured, line-by-line result stream instead of parsed stdout text. This
 * file is the only place that knows Claude-Code-specific flags/output shape,
 * so a future runner for another harness can be added as a sibling file
 * without touching auto-run.mjs.
 */

import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// `--output-format stream-json` emits one JSON object per line: a `system/init`
// line, per-turn `stream_event`/`assistant` lines (useful only as a liveness
// signal here), and exactly one final `type: "result"` line carrying
// `is_error`, `total_cost_usd`, `duration_ms`, and the text result.
function parseResultLine(line) {
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }
  return obj.type === 'result' ? obj : null;
}

/**
 * @param {object} opts
 * @param {string} opts.prompt - full staged-generation prompt text (sent over stdin)
 * @param {string} opts.cwd - repo checkout to run the agent in
 * @param {string} opts.logPath - file to stream the full NDJSON transcript to
 * @param {number} [opts.timeoutMs] - hard wall-clock cap for the whole call
 * @param {number} [opts.stallMs] - kill if no output line arrives for this long
 * @param {number} [opts.maxBudgetUsd] - forwarded to `claude --max-budget-usd`
 * @param {string} [opts.fallbackModel] - forwarded to `claude --fallback-model`
 * @returns {Promise<{ ok: boolean, exitCode: number|null, costUsd: number|null,
 *   durationMs: number|null, resultText: string|null, timedOut: boolean,
 *   stalled: boolean, errorReason: string|null }>}
 */
export function runClaude({
  prompt,
  cwd,
  logPath,
  timeoutMs = 20 * 60 * 1000,
  stallMs = 5 * 60 * 1000,
  maxBudgetUsd = 5,
  fallbackModel,
}) {
  return new Promise((resolve) => {
    mkdirSync(path.dirname(logPath), { recursive: true });
    const logStream = createWriteStream(logPath, { flags: 'a' });

    const args = [
      '-p', '--output-format', 'stream-json', '--include-partial-messages', '--verbose',
      '--permission-mode', 'bypassPermissions',
      '--no-session-persistence',
      '--max-budget-usd', String(maxBudgetUsd),
    ];
    if (fallbackModel) args.push('--fallback-model', fallbackModel);

    const child = spawn('claude', args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.write(prompt);
    child.stdin.end();

    let settled = false;
    let resultLine = null;
    let stdoutBuf = '';
    let stallTimer = null;
    let hardTimer = null;

    const finish = (extra) => {
      if (settled) return;
      settled = true;
      clearTimeout(stallTimer);
      clearTimeout(hardTimer);
      logStream.end();
      if (!child.killed) child.kill('SIGTERM');
      setTimeout(() => { if (!child.killed) child.kill('SIGKILL'); }, 5000);
      resolve({
        ok: false,
        exitCode: null,
        costUsd: resultLine?.total_cost_usd ?? null,
        durationMs: resultLine?.duration_ms ?? null,
        resultText: resultLine?.result ?? null,
        timedOut: false,
        stalled: false,
        errorReason: null,
        ...extra,
      });
    };

    const armStallTimer = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => finish({ stalled: true, errorReason: `no output for ${stallMs}ms` }), stallMs);
    };

    hardTimer = setTimeout(() => finish({ timedOut: true, errorReason: `exceeded ${timeoutMs}ms wall-clock cap` }), timeoutMs);
    armStallTimer();

    child.stdout.on('data', (chunk) => {
      logStream.write(chunk);
      armStallTimer();
      stdoutBuf += chunk.toString('utf8');
      const lines = stdoutBuf.split('\n');
      stdoutBuf = lines.pop(); // keep the last, possibly-partial line
      for (const line of lines) {
        const parsed = parseResultLine(line);
        if (parsed) resultLine = parsed;
      }
    });

    child.stderr.on('data', (chunk) => {
      logStream.write(chunk);
      armStallTimer();
    });

    child.on('error', (err) => finish({ errorReason: `spawn failed: ${err.message}` }));

    child.on('close', (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(stallTimer);
      clearTimeout(hardTimer);
      logStream.end();
      const ok = exitCode === 0 && resultLine != null && resultLine.is_error === false;
      resolve({
        ok,
        exitCode,
        costUsd: resultLine?.total_cost_usd ?? null,
        durationMs: resultLine?.duration_ms ?? null,
        resultText: resultLine?.result ?? null,
        timedOut: false,
        stalled: false,
        errorReason: ok ? null : (resultLine ? `agent reported an error (subtype: ${resultLine.subtype})` : `process exited ${exitCode} with no result line`),
      });
    });
  });
}
