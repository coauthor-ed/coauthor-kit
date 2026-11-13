#!/usr/bin/env node
// manifest - print a bundle's generated manifest.json (v1 metadata included) and the TODO lines for fields the kit cannot derive. OPERATOR ONLY.
//
//   node tools/operator/manifest.mjs --bundle <id> [--write]
// --write saves courses/<id>/manifest.json (publish regenerates it anyway). Never invents repository, license or version: fill them in bundle.json.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { bundleFromArg, defaultBundle } from '../sim-test/lib/bundle.mjs';
import { buildManifest, manifestTodos } from './lib/manifest.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'manifest', file: import.meta.url, usage: 'node tools/operator/manifest.mjs --bundle <id> [--write]', val: ['bundle'], bool: ['write'] });
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : defaultBundle();
if (!B) { console.error('pass --bundle <id>'); process.exit(2); }
const m = buildManifest(B);
const text = JSON.stringify(m, null, 2) + '\n';
if (A.has('write')) { fs.writeFileSync(path.join(B, 'manifest.json'), text); console.log(`wrote ${path.join(B, 'manifest.json')}`); } else process.stdout.write(text);
manifestTodos(m, path.basename(B)).forEach((l) => console.log(l));
