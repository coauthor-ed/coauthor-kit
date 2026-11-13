// One strict argument reader for the sim-test tools. Before this, each tool parsed its own flags: an unknown or
// mistyped flag (--stpes, --no-browsr) was ignored silently, `--bundle=id` worked in some tools and not others, and
// `--help` was taken for a scene name. Now: `--flag value` and `--flag=value` both work, -h/--help prints the usage,
// and an unknown flag ends the run (exit 2) with the closest valid one.
//
//   const a = parseArgs(process.argv.slice(2), { tool: 'check-scene', usage: '...', val: ['bundle'], bool: ['no-browser'] });
//   a.pos (positional args), a.val('bundle'), a.has('no-browser')
//   checkFlags(argv, spec)  - validation only, for a tool that keeps its own parsing (shoot, drive-dom)

const dist = (a, b) => {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
};

// --help: the usage line, then the tool's own header comment (its documentation), so nobody reads the source.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
function helpText(spec) {
  let head = '';
  try {
    const f = spec.file ? (spec.file.startsWith('file:') ? fileURLToPath(spec.file) : spec.file) : null;
    if (f) head = readFileSync(f, 'utf8').split('\n').slice(1).filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');
  } catch { /* usage only */ }
  return `usage: ${spec.usage}${head ? `\n\n${head}` : ''}`;
}

function fail(spec, msg) {
  console.error(`${spec.tool}: ${msg}\nusage: ${spec.usage}`);
  process.exit(2);
}

export function parseArgs(argv, spec) {
  const vals = new Set(spec.val || []), bools = new Set(spec.bool || []);
  const all = [...vals, ...bools];
  const pos = [], got = new Map();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { console.log(helpText(spec)); process.exit(0); }
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const eq = a.indexOf('=');
    const name = a.slice(2, eq < 0 ? undefined : eq);
    if (vals.has(name)) {
      if (eq >= 0) got.set(name, a.slice(eq + 1));
      else if (i + 1 < argv.length && !(argv[i + 1].startsWith('--') && vals.size && all.includes(argv[i + 1].slice(2).split('=')[0]))) got.set(name, argv[++i]);
      else fail(spec, `--${name} needs a value`);
    } else if (bools.has(name)) {
      if (eq >= 0) fail(spec, `--${name} takes no value`);
      got.set(name, true);
    } else {
      const near = all.map((n) => [n, dist(name, n)]).sort((x, y) => x[1] - y[1])[0];
      fail(spec, `unknown flag ${a.slice(0, 40)}${near && near[1] <= Math.max(2, Math.floor(name.length / 3)) ? ` (did you mean --${near[0]}?)` : ''}; flags: ${all.map((n) => '--' + n).join(' ')}`);
    }
  }
  return { pos, val: (n) => (got.has(n) ? got.get(n) : null), has: (n) => got.has(n) };
}

export function checkFlags(argv, spec) {
  const vals = new Set(spec.val || []), bools = new Set(spec.bool || []);
  const all = [...vals, ...bools];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { console.log(helpText(spec)); process.exit(0); }
    if (!a.startsWith('--')) continue;
    const name = a.slice(2).split('=')[0];
    if (vals.has(name)) { if (!a.includes('=')) i++; continue; }
    if (bools.has(name)) continue;
    const near = all.map((n) => [n, dist(name, n)]).sort((x, y) => x[1] - y[1])[0];
    fail(spec, `unknown flag ${a.slice(0, 40)}${near && near[1] <= Math.max(2, Math.floor(name.length / 3)) ? ` (did you mean --${near[0]}?)` : ''}; flags: ${all.map((n) => '--' + n).join(' ')}`);
  }
}

// --steps=JSON | --steps=@file for shoot, drive and drive-dom: a readable error for bad JSON (shell quoting is the usual
// cause), and a refusal of an object that repeats a key: {"ctrl":[..],"ctrl":[..]} keeps only the LAST one and the first
// action silently never happens (seen in a real run).
import fs from 'node:fs';
export function parseSteps(raw, tool) {
  let text = raw;
  if (raw.startsWith('@')) {
    if (!fs.existsSync(raw.slice(1))) { console.error(`${tool}: steps file ${raw.slice(1)} does not exist`); process.exit(2); }
    text = fs.readFileSync(raw.slice(1), 'utf8');
  }
  let value;
  try { value = JSON.parse(text); }
  catch (e) {
    const pos = Number((e.message.match(/position (\d+)/) || [])[1]);
    const near = Number.isFinite(pos) ? `\n  near: ...${text.slice(Math.max(0, pos - 40), pos)}<<HERE>>${text.slice(pos, pos + 30).replace(/\n/g, ' ')}...` : '';
    console.error(`${tool}: --steps is not valid JSON (${e.message}).${near}\n  Quote it as --steps='[{"beat":0}]' (single quotes outside, double inside). Nested quotes inside a probe or selector are the usual cause: write the steps to a file (cat > /tmp/steps.json <<'EOF' ... EOF) and pass --steps=@/tmp/steps.json`);
    process.exit(2);
  }
  if (!Array.isArray(value)) { console.error(`${tool}: --steps must be a JSON array of step objects, e.g. [{"beat":0},{"beat":1}]`); process.exit(2); }
  // duplicate keys inside one object: scan the text with a string-aware walk
  const dups = [];
  const stack = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      const str = text.slice(i + 1, j);
      const top = stack[stack.length - 1];
      if (top && top.type === 'o' && top.expectKey) { if (top.keys.has(str)) dups.push(str); top.keys.add(str); top.expectKey = false; }
      i = j;
    } else if (c === '{') stack.push({ type: 'o', keys: new Set(), expectKey: true });
    else if (c === '[') stack.push({ type: 'a' });
    else if (c === '}' || c === ']') stack.pop();
    else if (c === ',' && stack.length && stack[stack.length - 1].type === 'o') stack[stack.length - 1].expectKey = true;
  }
  if (dups.length) { console.error(`${tool}: a step repeats the key ${[...new Set(dups)].map((d) => `"${d}"`).join(', ')}: only the last one would run. Put each action in its own step.`); process.exit(2); }
  return value;
}
