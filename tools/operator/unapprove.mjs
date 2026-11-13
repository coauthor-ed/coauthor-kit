#!/usr/bin/env node
process.argv.push("--unapprove");
await import("./approve.mjs");
