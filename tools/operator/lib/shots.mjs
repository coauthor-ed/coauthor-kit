// Real-app screenshots through the preview launcher (shared by contact-sheet and showcase-shots).
import fs from 'node:fs';
import path from 'node:path';
import { playwright } from '../../sim-test/lib/serve.mjs';

export const VIEWPORTS = { phone: { width: 390, height: 800 }, desktop: { width: 1280, height: 720 } };

export async function launch() {
  const pw = playwright();
  if (!pw) throw new Error('Playwright not found (see doctor)');
  return pw.chromium.launch();
}

// Open a deep link in a fresh context with a theme and viewport; returns { page, ctx }.
export async function openAt(browser, link, { theme = 'light', viewport = 'desktop', wait = 1800 } = {}) {
  const ctx = await browser.newContext({ viewport: VIEWPORTS[viewport] || VIEWPORTS.desktop, colorScheme: theme });
  await ctx.addInitScript((t) => { try { localStorage.setItem('coauthor-theme', t); } catch { /* none */ } }, theme);
  const page = await ctx.newPage();
  await page.goto(link);
  await page.waitForTimeout(wait);
  return { page, ctx };
}

export async function shotTo(page, file, { quality = 60 } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, type: 'jpeg', quality });
  return fs.statSync(file).size;
}

export function withParams(link, params) {
  const [pre, hash] = link.split('#');
  const [hp, hq = ''] = (hash || '').split('?');
  const q = new URLSearchParams(hq);
  for (const [k, v] of Object.entries(params)) q.set(k, String(v));
  return `${pre}#${hp}?${q}`;
}
