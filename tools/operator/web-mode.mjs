#!/usr/bin/env node
// web-mode on|off|status - flip the mechanical web-search ban in the harness config files. OPERATOR ONLY.
//
//   node tools/operator/web-mode.mjs off|on|status
// Writes ./.claude/settings.json (Claude Code: permissions.deny WebSearch/WebFetch) and ./opencode.json
// (OpenCode: permission.webfetch/websearch). Other keys are preserved. Key names are kept in lib/harness.mjs:
// verify them against each harness's current docs when you upgrade it.
import { webState, setWeb } from './lib/harness.mjs';

const mode = process.argv[2];
if (!['on', 'off', 'status'].includes(mode)) { console.error('usage: node tools/operator/web-mode.mjs on|off|status'); process.exit(2); }
const root = process.cwd();
if (mode !== 'status') setWeb(root, mode === 'on');
const s = webState(root);
console.log(`web tools: claude-code ${s.claude}, opencode ${s.opencode}${mode === 'on' ? '\n(on = tools allowed; also pass --web to next/orchestrate so the invocation says Web: on)' : ''}`);
