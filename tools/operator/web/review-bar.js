// Review bar: injected into the engine's lesson preview by `?reviewApi=<kit url>` (engine: src/app.js imports this file, preview only).
// Panel layout (kept in localStorage): auto (default), left, right, top, bottom, float (drag by the handle), collapse to a chip. Docked modes sit OUTSIDE
// the lesson: the engine page (body) is pinned to the remaining rectangle, so fixed nav/footer buttons stay uncovered. Auto: wide landscape -> right
// column; tall or tablet -> top strip; small phone -> float. No browser dialogs: notices use the status line, destructive buttons ask Yes/Cancel inline.
// Shows the approval status of the slide on screen; Approve (then jumps to the next unapproved slide), Unapprove, note box, theme toggle,
// Copy fix prompt (one REVISE prompt with the accepted notes of this lesson; More: all lessons; count polled with the slide status),
// shortcuts a (approve) n (note) f (note: fact), and reloads the page when a file changes (block and beat stay in the URL).
// Roles (one file): 'page' = the UI inside the engine page (above); 'agent' = the engine embedded in kit frame.html: no UI, it only reports state
// (url, theme, size, keys) to the parent and runs its commands (goto, reload, theme); 'host' = the same UI rendered by frame.html beside the device frame.
// Kit-served, so it can change without an engine release. Writes need the pairing code printed by preview.mjs (asked once per kit).
const KIT = new URL(import.meta.url).origin;
function panel(role) {
  const HOST = role === 'host';
  const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
  const osTheme = () => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const pageTheme = () => document.documentElement.dataset.theme || osTheme();
  const st = { href: location.href, theme: null, w: innerWidth, h: innerHeight };
  const frame = HOST ? window.__kitHost.frame : null; const frameOrigin = () => { try { return new URL(frame.src).origin; } catch { return '*'; } };
  const send = (m) => frame.contentWindow?.postMessage({ kit: 1, ...m }, frameOrigin());
  const env = HOST ? {
    href: () => st.href, goto: (link) => send({ cmd: 'goto', link }), reload: () => send({ cmd: 'reload' }), theme: () => st.theme || osTheme(),
    setTheme: (t) => send({ cmd: 'theme', t }), viewport: () => `${st.w}x${st.h}`,
  } : {
    href: () => location.href, reload: () => location.reload(), theme: pageTheme, viewport: () => `${innerWidth}x${innerHeight}`,
    goto: (link) => { location.href = link; if (link.split('#')[0] === location.href.split('#')[0]) location.reload(); },
    setTheme: (t) => { document.documentElement.dataset.theme = t; ls.set('coauthor-theme', t); },
  };
  const bundle = () => (/\/courses\/([^/]+)\/manifest\.json/.exec(new URL(env.href()).searchParams.get('remoteManifestUrl') || '') || [])[1] || null;
  const host = document.createElement('div');
  host.style.cssText = HOST ? 'display:block;height:100%;visibility:hidden' : 'position:fixed;left:0;top:0;z-index:2147483000;visibility:hidden';
  const root = host.attachShadow({ mode: 'open' });
  // Tokens mirror the authoring app palette (coauthor src/ui/theme.css, body:has(#aa-shell)), light + dark. No raw colours below this block.
  root.innerHTML = `<style>
    :host { all: initial; --bg: #ffffff; --panel: #f1f5f9; --text: #0f172a; --muted: #64748b; --line: #cbd5e1; --pri: #4f46e5; --pri-h: #4338ca; --on-pri: #ffffff; --pri-l: #eef2ff;
      --ok-bg: #dcfce7; --ok: #166534; --warn-bg: #fef3c7; --warn: #92400e; --bad-bg: #ffe4e6; --bad: #be123c; --shadow: 0 10px 15px -3px rgb(0 0 0 / .18), 0 4px 6px -4px rgb(0 0 0 / .18); }
    :host([data-t="dark"]) { --bg: #131b2e; --panel: #1e293b; --text: #f8fafc; --muted: #94a3b8; --line: #334155; --pri: #818cf8; --pri-h: #a5b4fc; --on-pri: #0f172a; --pri-l: #1e1b4b;
      --ok-bg: rgb(16 185 129 / .2); --ok: #34d399; --warn-bg: rgb(245 158 11 / .2); --warn: #fbbf24; --bad-bg: rgb(244 63 94 / .2); --bad: #fb7185; --shadow: 0 10px 15px -3px rgb(0 0 0 / .5), 0 4px 6px -4px rgb(0 0 0 / .5); }
    * { box-sizing: border-box; }
    .bar { width: min(560px, calc(100vw - 16px)); border-radius: 12px; font: 600 13px/1.3 'Nunito', system-ui, sans-serif; background: var(--bg); color: var(--text); border: 1px solid var(--line); box-shadow: var(--shadow); overflow: hidden; }
    .bar.min { width: auto; max-width: calc(100vw - 16px); }
    .head { display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: var(--panel); cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; }
    .head.drag { cursor: grabbing; }
    .head:focus-visible { outline: 2px solid var(--pri); outline-offset: -2px; }
    .grip { color: var(--muted); flex: none; display: block; }
    .pills { display: flex; flex-wrap: wrap; gap: 4px; flex: 1 1 auto; min-width: 0; align-items: center; }
    .pill { padding: 2px 9px; border-radius: 999px; background: var(--bg); border: 1px solid var(--line); color: var(--muted); font-weight: 600; white-space: nowrap; }
    .pill.ok { background: var(--ok-bg); color: var(--ok); border-color: transparent; } .pill.warn { background: var(--warn-bg); color: var(--warn); border-color: transparent; }
    .pill[hidden] { display: none; }
    .tools { display: flex; gap: 2px; flex: none; }
    button, select { font: inherit; color: var(--text); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 5px 12px; min-height: 34px; cursor: pointer; transition: transform .12s, box-shadow .12s, border-color .12s; }
    button:hover:not(:disabled) { border-color: var(--pri); transform: translateY(-1px); box-shadow: 0 2px 6px rgb(0 0 0 / .12); }
    button:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid var(--pri); outline-offset: 1px; }
    button:disabled { opacity: .5; cursor: default; }
    button.go { background: var(--pri); border-color: var(--pri); color: var(--on-pri); } button.go:hover:not(:disabled) { background: var(--pri-h); border-color: var(--pri-h); }
    button.ic { padding: 0; width: 34px; border-color: transparent; background: transparent; color: var(--muted); display: grid; place-items: center; }
    button.ic:hover:not(:disabled) { color: var(--text); background: var(--bg); box-shadow: none; }
    button.ic.on { color: var(--pri); background: var(--pri-l); }
    button.ic svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .body { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px; }
    .bar.min .body { display: none; }
    .bar.min .tools .hide-min, .bar.min #sc { display: none; }
    .grow { flex: 1 1 120px; min-width: 40px; } .msg { color: var(--muted); font-weight: 600; }
    textarea { width: 100%; height: 64px; font: inherit; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); color: var(--text); padding: 6px 8px; resize: vertical; }
    .note { display: none; width: 100%; gap: 6px; flex-wrap: wrap; } .note.on { display: flex; }
    .msgrow { padding: 4px 10px; color: var(--muted); font-weight: 600; } .msgrow:empty { display: none; }
    .pair { display: flex; gap: 6px; flex-wrap: wrap; padding: 8px; align-items: center; border-top: 1px solid var(--line); } .pair[hidden], .cf[hidden], button[hidden] { display: none; }
    .pair input { flex: 1 1 120px; min-width: 0; font: inherit; color: var(--text); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 5px 8px; min-height: 34px; }
    .pair input:focus-visible { outline: 2px solid var(--pri); outline-offset: 1px; }
    .cf { display: inline-flex; gap: 6px; align-items: center; color: var(--warn); font-weight: 700; }
    .docks { display: flex; gap: 2px; flex: none; }
    .docks button.ic { width: 30px; min-height: 30px; } .docks button.ic svg { width: 18px; height: 18px; } .docks .tx { font-weight: 800; font-size: 12px; }
    .bar.min .docks { display: none; }
    .bar.side, .bar.strip { width: 100%; border-radius: 0; box-shadow: none; }
    .bar.side { height: 100%; overflow-y: auto; border-width: 0 0 0 1px; } .bar.side.l { border-width: 0 1px 0 0; }
    .bar.side .body { align-content: flex-start; }
    .bar.strip { display: flex; flex-wrap: wrap; align-items: center; border-width: 0 0 1px 0; } .bar.strip.b { border-width: 1px 0 0 0; }
    .bar.strip { background: var(--panel); } .bar.strip .head { flex: 0 1 auto; align-self: stretch; } .bar.strip .body { flex: 1 1 320px; }
    .bar.strip .msgrow, .bar.strip .pair { flex: 1 0 100%; }
    .bar.side .head, .bar.strip .head { cursor: default; touch-action: auto; } .bar.side .grip, .bar.strip .grip { display: none; }
    .extra { display: contents; } #more { display: none; }
    .bar.cmp #more { display: inline-block; } .bar.cmp .extra { display: none; } .bar.cmp.more .extra { display: flex; flex-wrap: wrap; gap: 6px; flex: 1 0 100%; }
    .bar.cmp .body { padding: 6px 8px; gap: 6px; } .bar.cmp .head { padding: 4px 8px; }
    .bar.cmp .pills { flex-wrap: nowrap; overflow: hidden; } .bar.cmp .pill { padding: 1px 7px; font-size: 12px; }
    .bar.cmp #ap { flex: 1 1 auto; } .bar.cmp #nt, .bar.cmp #fx, .bar.cmp #more { flex: 0 0 auto; }
    .cbox { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; border-top: 1px solid var(--line); } .cbox[hidden] { display: none; }
    .cbox textarea { height: 110px; font: 12px/1.4 ui-monospace, Menlo, monospace; }
    .bar.side { overflow-x: hidden; } .bar, .body, .head { min-width: 0; } .docks button:disabled { display: none; }
    @media (max-width: 480px) { .body button:not(.ic) { flex: 0 1 auto; } }
    .nlist, .tbox { border-top: 1px solid var(--line); padding: 6px 8px; display: flex; flex-direction: column; gap: 6px; max-height: 46vh; overflow-y: auto; } .nlist[hidden], .tbox[hidden] { display: none; }
    .ntool { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; color: var(--muted); }
    .ntool label { display: flex; gap: 4px; align-items: center; cursor: pointer; } .ntool input { accent-color: var(--pri); }
    .nrow { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); }
    .nrow.dim { opacity: .62; } .ntext { flex: 1 1 100%; font-weight: 500; overflow-wrap: anywhere; white-space: pre-wrap; }
    .nrow button, .nrow select, .tbox button { min-height: 30px; padding: 2px 10px; font-size: 12px; }
    .nrow input { flex: 1 1 120px; min-width: 0; font: inherit; color: var(--text); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 4px 8px; min-height: 30px; }
    .pill.bad { background: var(--bad-bg); color: var(--bad); border-color: transparent; }
    .tbox pre { margin: 0; padding: 6px 8px; background: var(--panel); border-radius: 8px; font: 11px/1.4 ui-monospace, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 30vh; overflow: auto; }
  </style>
  <div class="bar" role="region" aria-label="Review panel">
    <div class="head" id="head" tabindex="0" role="group" aria-label="Review panel handle: drag, or use arrow keys to move (float layout)">
      <svg class="grip" width="12" height="16" viewBox="0 0 12 16" aria-hidden="true"><circle cx="3" cy="3" r="1.4" fill="currentColor"/><circle cx="9" cy="3" r="1.4" fill="currentColor"/><circle cx="3" cy="8" r="1.4" fill="currentColor"/><circle cx="9" cy="8" r="1.4" fill="currentColor"/><circle cx="3" cy="13" r="1.4" fill="currentColor"/><circle cx="9" cy="13" r="1.4" fill="currentColor"/></svg>
      <div class="pills"><span class="pill" id="pos">-</span><span class="pill" id="st">-</span><span class="pill" id="sc" hidden></span></div>
      <div class="tools">
        <button class="ic" id="fold" title="Collapse" aria-label="Collapse panel" aria-expanded="true"><svg viewBox="0 0 16 16" aria-hidden="true"><path id="foldp" d="M3 8h10"/></svg></button>
      </div>
    </div>
    <div class="msgrow" id="msg" role="status" aria-live="polite"></div>
    <div class="pair" id="pair" hidden><input id="pcode" type="text" inputmode="numeric" autocomplete="off" aria-label="Pairing code" placeholder="Pairing code (printed where preview.mjs runs)"><button class="go" id="psave">Save code</button><button id="pcancel">Cancel</button></div>
    <div class="body">
      <div class="extra"><div class="docks" role="group" aria-label="Panel layout">
        <button class="ic" id="d-auto" title="Layout: auto" aria-label="Layout auto"><span class="tx">A</span></button>
        <button class="ic" id="d-left" title="Dock left" aria-label="Dock left"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M6 2.5v11"/></svg></button>
        <button class="ic" id="d-right" title="Dock right" aria-label="Dock right"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M10 2.5v11"/></svg></button>
        <button class="ic" id="d-top" title="Dock top" aria-label="Dock top"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 6.5h12"/></svg></button>
        <button class="ic" id="d-bottom" title="Dock bottom" aria-label="Dock bottom"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 9.5h12"/></svg></button>
        <button class="ic" id="d-float" title="Float (drag the handle)" aria-label="Float"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><rect x="5" y="5" width="6" height="4" rx="1"/></svg></button>
      </div>
      </div><button class="go" id="ap" title="a">Approve + next</button><button id="nt" title="n">Note</button><button id="fx" disabled>Copy fix prompt</button><button id="mk" hidden title="Set the notes of the prompt you just copied to done">Mark done</button><button id="rt" hidden title="Run this scene's Must-get-right tests file">Run tests</button><button id="mr" hidden title="Built with Review: manual: set the scene Status to done">Mark reviewed</button><button id="more" aria-expanded="false" title="More: unapprove, notes, theme, layout">More</button><div class="extra" id="extra2"><button id="nl" aria-expanded="false" title="Saved notes of this slide: state, edit, delete">Notes</button><button id="un">Unapprove</button><button id="fxall" disabled>Fix prompt: all lessons</button><button id="th">Theme</button></div>
      <div class="note" id="notebox"><textarea id="txt" aria-label="Note" placeholder="What is wrong here? Beat, theme and window size are recorded."></textarea>
        <select id="kind" aria-label="Note kind"><option>fact</option><option>pedagogy</option><option>language</option><option selected>bug</option><option>other</option><option value="alternative">another way</option></select>
        <button class="go" id="send">Save note</button><button id="cancel">Cancel</button></div>
    </div>
    <div class="tbox" id="tbox" hidden></div>
    <div class="nlist" id="nlist" hidden><div class="ntool"><span id="nhead">Notes of this slide</span><label><input type="checkbox" id="nall"> show done</label></div><div id="nrows" style="display:contents"></div></div>
    <div class="cbox" id="cbox" hidden><span class="msg">Copy did not work here. Select all and copy (Ctrl+C):</span><textarea id="cta" readonly aria-label="Fix prompt"></textarea><button id="cclose">Close</button></div>
  </div>`;
  (HOST ? window.__kitHost.slot : document.documentElement).append(host);
  const $ = (id) => root.getElementById(id);
  const say = (t) => { $('msg').textContent = t; clearTimeout(say.t); say.t = setTimeout(() => { $('msg').textContent = ''; }, 4500); };
  // Inline two-step confirm: the button is replaced by 'Confirm? Yes / Cancel' for 5 s.
  function twoStep(btn, q, fn) {
    const cf = document.createElement('span'); cf.className = 'cf'; cf.hidden = true;
    const yes = document.createElement('button'); yes.className = 'go'; yes.textContent = 'Yes'; const no = document.createElement('button'); no.textContent = 'Cancel';
    cf.append(q, ' ', yes, no); btn.after(cf); let t = 0;
    const off = () => { clearTimeout(t); cf.hidden = true; btn.hidden = false; };
    const on = () => { if (btn.disabled) return; btn.hidden = true; cf.hidden = false; yes.focus(); t = setTimeout(off, 5000); };
    btn.onclick = on; yes.onclick = () => { off(); fn(); }; no.onclick = () => { off(); btn.focus(); };
    return on;
  }
  let cur = null;

  function position() {
    const h = new URL(env.href()).hash; const m = /#\/lesson\/courses\/[^/]+\/(lessons\/[^?]+\.json)(?:\?(.*))?/.exec(h);
    if (!m) return null;
    const q = new URLSearchParams(m[2] || '');
    return { lesson: m[1], index: Number(q.get('block') || 0), beat: q.has('beat') ? Number(q.get('beat')) : null };
  }
  async function refresh() {
    const pos = position();
    if (!pos || !bundle()) { $('pos').textContent = 'no lesson'; cur = null; return; }
    try {
      const r = await fetch(`${KIT}/_kit/item?bundle=${encodeURIComponent(bundle())}&lesson=${encodeURIComponent(pos.lesson)}&index=${pos.index}`);
      cur = r.ok ? await r.json() : null;
    } catch { cur = null; }
    if (!cur) { $('pos').textContent = 'kit unreachable'; return; }
    $('pos').textContent = `${cur.code} slide ${cur.n}/${cur.total}`;
    const ok = cur.status === 'human-approved';
    $('st').textContent = ok ? 'approved' : 'draft'; $('st').className = 'pill ' + (ok ? 'ok' : '');
    $('sc').hidden = !cur.scene; if (cur.scene) { $('sc').textContent = cur.scene.status === 'review-pending' ? 'scene: built, waiting for your review' : `scene: ${cur.scene.status || '?'}`; $('sc').className = 'pill ' + (cur.scene.status === 'done' ? 'ok' : 'warn'); }
    $('rt').hidden = !cur.scene?.tests; $('mr').hidden = cur.scene?.status !== 'review-pending'; $('rt').classList.toggle('go', cur.scene?.status === 'review-pending');
    if (testFor && testFor !== cur.scene?.src) { testFor = null; $('tbox').hidden = true; }
    fixCounts(); loadNotes();
  }
  // Pairing code: asked once, inline (no browser dialog).
  function code() {
    const c = ls.get('kit-code:' + KIT); if (c) return Promise.resolve(c);
    if (pl.min) { pl.min = false; saveP(); syncUi(); }
    return new Promise((res) => {
      const fin = (v) => { $('pair').hidden = true; $('pcode').value = ''; if (v) ls.set('kit-code:' + KIT, v); res(v); };
      $('pair').hidden = false; $('pcode').focus();
      $('psave').onclick = () => fin($('pcode').value.trim()); $('pcancel').onclick = () => fin('');
      $('pcode').onkeydown = (e) => { if (e.key === 'Enter') fin($('pcode').value.trim()); else if (e.key === 'Escape') fin(''); };
    });
  }
  async function post(path, body) {
    const c = await code(); if (!c) { say('no pairing code'); return null; }
    const r = await fetch(KIT + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Kit-Code': c }, body: JSON.stringify({ bundle: bundle(), ...body }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { ls.set('kit-code:' + KIT, ''); say('wrong pairing code'); return null; }
    if (!r.ok) { say(j.error || 'failed'); return null; }
    return j;
  }
  async function approve() {
    const pos = position(); if (!pos || !cur) return;
    const j = await post('/_kit/approve', { lessonFile: pos.lesson, index: pos.index }); if (!j) return;
    say('approved'); const next = j.item?.next; await refresh();
    if (next?.link) env.goto(next.link); else say('nothing left to approve');
  }
  async function unapprove() { const pos = position(); if (!pos) return; if (await post('/_kit/unapprove', { lessonFile: pos.lesson, index: pos.index })) { say('back to draft'); refresh(); } }
  function openNote(kind) { $('notebox').classList.add('on'); if (kind) $('kind').value = kind; $('txt').focus(); }
  async function sendNote() {
    const pos = position(); const text = $('txt').value.trim(); if (!pos || !cur || !text) return;
    const alt = $('kind').value === 'alternative';   // an alternative note is about a scene: scope L02/RampScene, not the slide
    if (alt && !cur.scene) { say('another way needs a slide with a scene'); return; }
    const j = await post('/_kit/notes', { scope: alt ? `${cur.code}/${String(cur.scene.src).split('/').pop().replace(/\.js$/, '')}` : cur.scope, beat: pos.beat, theme: env.theme(), viewport: env.viewport(), kind: $('kind').value, text });
    if (j) { $('txt').value = ''; $('notebox').classList.remove('on'); say(`note ${j.id} saved`); fixCounts(); }
  }
  // Fix prompt from accepted notes (/_kit/fixprompt). Model notes (state open) are left out until accepted in the dashboard.
  let fixN = { lesson: 0, all: 0, open: 0 };
  async function fixCounts() {
    const b = bundle(); if (!b || !cur) return;
    try {
      const r = await fetch(`${KIT}/_kit/fixprompt?bundle=${encodeURIComponent(b)}`); if (!r.ok) return;
      const j = await r.json(); fixN = { lesson: j.prompts.find((x) => x.lesson === String(cur.code).toUpperCase())?.ids.length || 0, all: j.count, open: j.unaccepted || 0 };
    } catch { return; }
    const nn = (n) => `${n} note${n === 1 ? '' : 's'}`; const wait = fixN.open ? ` ${fixN.open} model note(s) wait for Accept in the dashboard.` : '';
    $('fx').textContent = `Copy fix prompt (${nn(fixN.lesson)})`; $('fx').disabled = !fixN.lesson;
    $('fx').title = fixN.lesson ? `Copy one REVISE prompt with the ${nn(fixN.lesson)} of ${cur.code}.${wait}` : `No accepted notes for ${cur.code}: save a note first (n).${wait}`;
    $('fxall').textContent = `Fix prompt: all lessons (${nn(fixN.all)})`; $('fxall').disabled = !fixN.all;
    $('fxall').title = fixN.all ? `Copy one REVISE prompt with every accepted note of the bundle.${wait}` : `No accepted notes in this bundle.${wait}`;
  }
  // Copy: async clipboard (secure context), else a hidden textarea + execCommand (plain-HTTP LAN), else show the text inline to select.
  async function copyText(text) {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch { /* fall through */ }
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    root.append(ta); ta.select(); ta.setSelectionRange(0, text.length); let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; } ta.remove();
    if (ok) return true;
    $('cta').value = text; $('cbox').hidden = false; $('cta').focus(); $('cta').select(); return false;
  }
  async function copyFix(all) {
    const b = bundle(); if (!b || !cur) return;
    try {
      const r = await fetch(`${KIT}/_kit/fixprompt?bundle=${encodeURIComponent(b)}&combined=1${all ? '' : `&lesson=${encodeURIComponent(cur.code)}`}`);
      const j = await r.json(); if (!r.ok || !j.count) { say(j.error || 'no accepted notes'); return; }
      lastIds = j.ids || []; $('mk').hidden = !lastIds.length; $('mk').textContent = lastIds.length === 1 ? 'Mark this note done' : `Mark these ${lastIds.length} done`;
      if (await copyText(j.text)) say(`Copied fix prompt (${j.count} note${j.count === 1 ? '' : 's'}${all ? `, ${j.lessons.length} lesson(s)` : ''})`); else say('select the text below and copy');
    } catch { say('kit unreachable'); }
  }
  $('fx').onclick = () => copyFix(false); $('fxall').onclick = () => copyFix(true); $('cclose').onclick = () => { $('cbox').hidden = true; };
  // Mark these N done: exactly the ids of the fix prompt copied last.
  let lastIds = [];
  $('mk').onclick = async () => { if (!lastIds.length) return; const j = await post('/_kit/notes/state', { ids: lastIds, state: 'done' }); if (j) { say(`${j.updated} note(s) done`); lastIds = []; $('mk').hidden = true; fixCounts(); loadNotes(true); } };
  // Saved notes of this slide (and its scene): state, Edit (inline), Delete (Yes/Cancel). Rebuilt only when not editing.
  const KINDS = ['fact', 'pedagogy', 'language', 'bug', 'other', 'direction', 'alternative'], STATES = ['open', 'accepted', 'rejected', 'done'];
  const mk = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); for (const k of kids) if (k != null && k !== '') e.append(k); return e; };
  const sel = (list, v, label) => { const x = mk('select', { ariaLabel: label }); for (const o of list) x.append(mk('option', { value: o, textContent: o, selected: o === v })); return x; };
  let editing = false, notesKey = '';
  const mine = (n) => cur && (n.scope === cur.scope || (cur.scene && n.scope === `${cur.code}/${String(cur.scene.src).split('/').pop().replace(/\.js$/, '')}`));
  async function loadNotes(force) {
    const b = bundle(); if (!b || !cur) return;
    let all; try { const r = await fetch(`${KIT}/_kit/notes?bundle=${encodeURIComponent(b)}`); if (!r.ok) return; all = await r.json(); } catch { return; }
    const ns = all.filter(mine), live = ns.filter((n) => n.state === 'open' || n.state === 'accepted').length;
    $('nl').textContent = `Notes (${live}${ns.length > live ? ` +${ns.length - live} done` : ''})`;
    const key = JSON.stringify(ns) + $('nall').checked;
    if ($('nlist').hidden || editing || (!force && key === notesKey)) return; notesKey = key;
    $('nhead').textContent = `Notes of ${cur.scope}`;
    const rows = $('nrows'); rows.replaceChildren();
    const shown = ns.filter((n) => $('nall').checked || n.state === 'open' || n.state === 'accepted');
    if (!shown.length) rows.append(mk('div', { className: 'msg', textContent: ns.length ? 'Only done notes here: tick show done.' : 'No notes on this slide yet (n).' }));
    for (const n of shown) rows.append(noteRow(n));
  }
  function noteRow(n) {
    const row = mk('div', { className: 'nrow' + (n.state === 'done' || n.state === 'rejected' ? ' dim' : '') });
    const st = sel(STATES, n.state, `State of ${n.id}`);
    st.onchange = async () => { if (await post('/_kit/notes/state', { ids: [n.id], state: st.value })) { say(`${n.id} ${st.value}`); fixCounts(); loadNotes(true); } };
    const ed = mk('button', { textContent: 'Edit', onclick: () => { editing = true; row.replaceWith(noteEdit(n)); } });
    const del = mk('button', { textContent: 'Delete' });
    row.append(mk('span', { className: 'pill', textContent: n.id }), mk('span', { className: 'pill' + (n.kind === 'direction' ? ' ok' : ''), textContent: n.kind + (n.stage ? ` stage ${n.stage}` : '') }), n.beat != null ? mk('span', { className: 'pill', textContent: `beat ${n.beat}` }) : '', st, ed, del, mk('div', { className: 'ntext', textContent: n.text }));
    twoStep(del, `Delete ${n.id}?`, async () => { if (await post('/_kit/notes/delete', { id: n.id })) { say(`${n.id} deleted`); fixCounts(); loadNotes(true); } });
    return row;
  }
  function noteEdit(n) {
    const box = mk('div', { className: 'nrow' }); const ta = mk('textarea', { value: n.text, ariaLabel: 'Note text' });
    const kd = sel(KINDS, n.kind, 'Kind'); const sc = mk('input', { value: n.scope, ariaLabel: 'Scope', placeholder: 'L02S03, L02, L02/Scene or bundle' });
    const done = () => { editing = false; loadNotes(true); };
    box.append(mk('span', { className: 'pill', textContent: n.id }), ta, kd, sc,
      mk('button', { className: 'go', textContent: 'Save', onclick: async () => { if (await post('/_kit/notes/edit', { id: n.id, text: ta.value, kind: kd.value, scope: sc.value })) { say(`${n.id} saved`); fixCounts(); done(); } } }),
      mk('button', { textContent: 'Cancel', onclick: done }));
    setTimeout(() => ta.focus(), 0); return box;
  }
  $('nl').onclick = () => { const on = $('nlist').hidden; $('nlist').hidden = !on; $('nl').setAttribute('aria-expanded', String(on)); if (on) loadNotes(true); place(); };
  $('nall').onchange = () => loadNotes(true);
  // Scene tests (the build pass writes them, never runs them; Review: manual leaves them to you) and Mark reviewed.
  let testFor = null;
  $('rt').onclick = async () => {
    if (!cur?.scene) return; const src = cur.scene.src; testFor = src; $('rt').disabled = true; $('rt').textContent = 'Running tests...';
    const j = await post('/_kit/runtests', { src }); $('rt').disabled = false; $('rt').textContent = 'Run tests'; if (!j || testFor !== src) return;
    const box = $('tbox'); box.replaceChildren(); box.hidden = false;
    const add = j.fails?.length ? mk('button', { textContent: 'Add failures as notes', onclick: async () => { const n = await post('/_kit/notes', { scope: cur.scope, kind: 'bug', text: `Must-get-right tests failed (${src.split('/').slice(-2).join('/').replace(/\.js$/, '')}): ${j.fails.join(' | ')}`.slice(0, 2000) }); if (n) { say(`note ${n.id} saved`); add.disabled = true; loadNotes(true); } } }) : '';
    box.append(mk('div', { className: 'ntool' }, mk('span', { className: 'pill ' + (j.ok ? 'ok' : 'bad'), textContent: j.summary }), add, mk('button', { textContent: 'Copy command', title: j.cmd, onclick: () => copyText(j.cmd) }), mk('button', { textContent: 'Hide', onclick: () => { box.hidden = true; place(); } })), mk('pre', { textContent: j.output }));
    say(j.summary); place();
  };
  $('mr').onclick = async () => { if (!cur?.scene) return; if (await post('/_kit/scene/reviewed', { src: cur.scene.src })) { say('marked reviewed: Status done'); refresh(); } };
  const askApprove = twoStep($('ap'), 'Approve this slide?', approve); twoStep($('un'), 'Back to draft?', unapprove); $('nt').onclick = () => openNote(); $('send').onclick = sendNote; $('cancel').onclick = () => $('notebox').classList.remove('on');
  // ---- placement: auto / left / right / top / bottom (outside the lesson) or float (drag the handle); remembered ----
  const DEV = new URLSearchParams(location.search).get('device') || 'phone';
  const KEY = HOST ? 'kit-host:v1:' + DEV : 'kit-panel:v2';
  let pl = HOST ? { mode: DEV === 'phone' ? 'right' : 'float', x: null, y: null, min: false } : { mode: 'auto', x: null, y: 72, min: false };
  try { Object.assign(pl, JSON.parse(ls.get(KEY) || '{}')); } catch { /* defaults */ }
  const saveP = () => ls.set(KEY, JSON.stringify(pl));
  const bar = root.querySelector('.bar');
  const M = 8;
  // Float's top inset sits just under the app header (its height lives in the engine's shadow DOM, so it is a measured constant).
  const topInset = () => (innerWidth >= 700 ? 70 : 60);
  // Measured on the engine: the lesson column fills the viewport width (max-width = viewport - gutters), so there is never free space beside it;
  // docking therefore shrinks the page. Wide landscape keeps height (side column); tall or tablet spends spare height (strip); a small phone floats.
  const autoMode = () => { const w = innerWidth, h = innerHeight; if (w >= 1200 && w >= h * 1.3 && sideOk()) return 'right'; if (w < 700 && h >= 600) return 'bottom'; if (h >= 900 || (w >= 700 && h >= 700)) return 'top'; return 'float'; };
  const sideW = () => 320;
  // Side columns are only allowed while the lesson keeps >= 600px (engine two-column layout needs it); narrower viewports fall back to a strip
  // without touching the saved choice.
  const MIN_LESSON = 600; const sideOk = () => innerWidth - sideW() >= MIN_LESSON;
  // Pin the engine page to the remaining rectangle. A transformed body is the containing block for the engine's position:fixed parts (footer nav),
  // and #app scrolls inside it. Inline CSSOM only (CSP-safe); fully undone for float.
  const PIN = { html: ['overflow'], body: ['position', 'top', 'right', 'bottom', 'left', 'margin', 'overflow', 'transform', 'width', 'height', 'min-height'], app: ['height', 'overflow', 'overflow-x'] };
  function reserve(t, r, b, l) {
    if (HOST) return;
    const html = document.documentElement.style, body = document.body.style, appEl = document.getElementById('app'), app = appEl && appEl.style;
    if (!(t || r || b || l)) { PIN.html.forEach((p) => html.removeProperty(p)); PIN.body.forEach((p) => body.removeProperty(p)); if (app) PIN.app.forEach((p) => app.removeProperty(p)); return; }
    html.setProperty('overflow', 'hidden');
    for (const [k, v] of [['position', 'fixed'], ['top', t + 'px'], ['right', r + 'px'], ['bottom', b + 'px'], ['left', l + 'px'], ['margin', '0'], ['width', 'auto'], ['height', 'auto'], ['min-height', '0'], ['overflow', 'hidden'], ['transform', 'translateZ(0)']]) body.setProperty(k, v);
    if (app) { app.setProperty('height', '100%'); app.setProperty('overflow', 'auto'); app.setProperty('overflow-x', 'hidden'); }
  }
  let eff = 'float';
  // Float start spot in the host page: beside the device if there is room (right, left, below), else the top-right corner.
  function freeSpot(w, h) {
    const d = window.__kitHost.dev.getBoundingClientRect(), G = 16;
    const MINW = 320, R = innerWidth - d.right - G - M, L = d.left - G - M;
    if (R >= MINW) return [d.right + G, Math.max(M, d.top), Math.min(w, R)];
    if (L >= MINW) { const ww = Math.min(w, L); return [d.left - G - ww, Math.max(M, d.top), ww]; }
    if (innerHeight - d.bottom - G - M >= h) return [Math.max(M, (innerWidth - w) / 2), d.bottom + G, w];
    return [innerWidth - w - M, M, w];
  }
  function place() {
    eff = pl.min ? 'float' : (pl.mode === 'auto' ? autoMode() : pl.mode);
    if (!HOST) {
      if ((eff === 'left' || eff === 'right') && !sideOk()) eff = 'top';
      bar.classList.toggle('cmp', innerWidth < 600); if (innerWidth >= 600) bar.classList.remove('more'); $('more').setAttribute('aria-expanded', String(bar.classList.contains('more')));
      $('d-left').disabled = $('d-right').disabled = !sideOk();
    }
    bar.classList.toggle('side', eff === 'left' || eff === 'right'); bar.classList.toggle('strip', eff === 'top' || eff === 'bottom');
    bar.classList.toggle('l', eff === 'left'); bar.classList.toggle('b', eff === 'bottom');
    const hs = host.style; for (const p of ['left', 'top', 'right', 'bottom', 'width', 'height']) hs.removeProperty(p);
    if (HOST) {
      // Docked: the host stage reflows (flex direction by data-dock) and the device stays exactly device-sized. Float: fixed over the host page.
      window.__kitHost.stage.dataset.dock = eff;
      if (eff !== 'float') { hs.position = 'static'; hs.height = '100%'; hs.visibility = 'visible'; return; }
      hs.position = 'fixed'; hs.zIndex = '50'; hs.height = 'auto';
    }
    if (eff === 'left' || eff === 'right') {
      const w = sideW(); hs.width = w + 'px'; hs.height = '100vh'; hs.top = '0'; hs[eff] = '0'; hs.visibility = 'visible';
      reserve(0, eff === 'right' ? w : 0, 0, eff === 'left' ? w : 0); return;
    }
    if (eff === 'top' || eff === 'bottom') {
      hs.width = '100vw'; hs.left = '0'; hs[eff] = '0'; hs.visibility = 'visible';
      const h = Math.ceil(host.getBoundingClientRect().height); reserve(eff === 'top' ? h : 0, 0, eff === 'bottom' ? h : 0, 0); return;
    }
    reserve(0, 0, 0, 0);
    hs.left = '0'; hs.top = '0';
    if (HOST && pl.x == null) bar.style.removeProperty('width');
    const r = host.getBoundingClientRect(); let w = r.width, h = r.height; if (!w) return;
    const auto = HOST && pl.x == null; let q0 = null; if (auto) { q0 = freeSpot(w, h); bar.style.width = q0[2] + 'px'; w = q0[2]; h = host.getBoundingClientRect().height; }
    let x = q0 ? q0[0] : (pl.x ?? (innerWidth - w) / 2), y = q0 ? q0[1] : (pl.min && pl.mode !== 'float' && !HOST ? topInset() : (pl.y ?? topInset()));
    x = Math.min(Math.max(M, x), Math.max(M, innerWidth - w - M));
    y = Math.min(Math.max(M, y), Math.max(M, innerHeight - h - M));
    hs.left = Math.round(x) + 'px'; hs.top = Math.round(y) + 'px'; hs.visibility = 'visible';
    if (pl.mode === 'float' && !auto) { pl.x = x; pl.y = y; }
  }
  const MODES = ['auto', 'left', 'right', 'top', 'bottom', 'float']; if (HOST) $('d-auto').hidden = true;
  function syncUi() {
    bar.classList.toggle('min', pl.min); $('fold').setAttribute('aria-expanded', String(!pl.min));
    $('fold').title = pl.min ? 'Expand' : 'Collapse'; $('fold').setAttribute('aria-label', pl.min ? 'Expand panel' : 'Collapse panel');
    $('foldp').setAttribute('d', pl.min ? 'M3 8h10M8 3v10' : 'M3 8h10');
    for (const m of MODES) { $('d-' + m).classList.toggle('on', pl.mode === m); $('d-' + m).setAttribute('aria-pressed', String(pl.mode === m)); }
    requestAnimationFrame(place);
  }
  const setMode = (m) => { pl.mode = m; if (m !== 'float') { pl.x = null; if (HOST) bar.style.removeProperty('width'); } saveP(); syncUi(); };
  for (const m of MODES) $('d-' + m).onclick = () => setMode(m);
  $('more').onclick = () => { bar.classList.toggle('more'); place(); };
  $('fold').onclick = () => { pl.min = !pl.min; saveP(); syncUi(); };
  const head = $('head'); let drag = null;
  const floating = () => eff === 'float';
  head.addEventListener('pointerdown', (e) => {
    if (!floating() || e.target.closest('button') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const r = host.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }; head.classList.add('drag'); head.setPointerCapture(e.pointerId);
  });
  head.addEventListener('pointermove', (e) => {
    if (!drag) return; pl.mode = 'float'; pl.x = e.clientX - drag.dx; pl.y = e.clientY - drag.dy; place(); syncModes();
  });
  const endDrag = () => { if (!drag) return; drag = null; head.classList.remove('drag'); saveP(); };
  head.addEventListener('pointerup', endDrag); head.addEventListener('pointercancel', endDrag);
  const syncModes = () => { for (const m of MODES) { $('d-' + m).classList.toggle('on', pl.mode === m); $('d-' + m).setAttribute('aria-pressed', String(pl.mode === m)); } };
  head.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[e.key]; if (!d || !floating()) return;
    e.preventDefault(); const r = host.getBoundingClientRect(); pl.mode = 'float'; pl.x = r.left + d[0]; pl.y = r.top + d[1]; place(); syncModes(); saveP();
  });
  new ResizeObserver(place).observe(bar); addEventListener('resize', place); addEventListener('orientationchange', () => setTimeout(place, 150)); syncUi();
  // Follow the page theme (the engine sets data-theme on <html>, else the OS setting; embedded, the agent reports it).
  const syncTheme = () => { host.setAttribute('data-t', env.theme()); if (HOST) document.documentElement.dataset.theme = env.theme(); };
  if (!HOST) new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  syncTheme();
  $('th').onclick = () => { env.setTheme(env.theme() === 'dark' ? 'light' : 'dark'); syncTheme(); };
  const onKey = (key, e) => { if (key === 'a') askApprove(); else if (key === 'n') { e?.preventDefault(); openNote(); } else if (key === 'f') { e?.preventDefault(); openNote('fact'); } };
  addEventListener('keydown', (e) => {
    if (typing(e) || root.activeElement || e.metaKey || e.ctrlKey || e.altKey) return;
    onKey(e.key, e);
  });
  if (HOST) {
    addEventListener('message', (e) => {
      const m = e.data; if (e.source !== frame.contentWindow || !m || !m.kit) return;
      if (m.type === 'hello') send({ type: 'ack' });
      else if (m.type === 'state') { st.href = m.href; st.theme = m.theme; st.w = m.w; st.h = m.h; syncTheme(); refresh(); }
      else if (m.type === 'key') onKey(m.key);
    });
  } else addEventListener('hashchange', refresh);
  setInterval(refresh, 1500); refresh();
  try {
    new EventSource(KIT + '/_kit/events').onmessage = (ev) => { try { const d = JSON.parse(ev.data); if (d.bundle !== bundle() || (d.lesson && cur && d.lesson !== cur.code)) return; } catch { /* untagged: reload */ } if (!$('txt').value.trim()) env.reload(); else say('files changed: reload after saving your note'); };
  } catch { /* no live reload */ }
}

// Embedded in kit frame.html: no UI here; report to the parent, obey its commands. No parent answer within 2 s -> behave as a normal page.
function agent() {
  let acked = false;
  const up = (m) => parent.postMessage({ kit: 1, ...m }, KIT);
  const theme = () => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const state = () => up({ type: 'state', href: location.href, theme: theme(), w: innerWidth, h: innerHeight });
  addEventListener('message', (e) => {
    const m = e.data; if (e.source !== parent || e.origin !== KIT || !m || !m.kit) return;
    if (m.type === 'ack') { acked = true; state(); }
    else if (m.cmd === 'reload') location.reload();
    else if (m.cmd === 'goto' && typeof m.link === 'string') { location.href = m.link; if (m.link.split('#')[0] === location.href.split('#')[0]) location.reload(); }
    else if (m.cmd === 'theme') { document.documentElement.dataset.theme = m.t; try { localStorage.setItem('coauthor-theme', m.t); } catch { /* private mode */ } }
  });
  addEventListener('hashchange', () => acked && state()); addEventListener('resize', () => acked && state());
  new MutationObserver(() => acked && state()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  addEventListener('keydown', (e) => {
    if (!acked || typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'a' || e.key === 'n' || e.key === 'f') { if (e.key !== 'a') e.preventDefault(); up({ type: 'key', key: e.key }); }
  });
  let last = ''; setInterval(() => { if (acked && location.href !== last) { last = location.href; state(); } }, 400); // the engine moves between slides with replaceState (no event)
  const t = setInterval(() => { if (acked) clearInterval(t); else up({ type: 'hello' }); }, 250); up({ type: 'hello' });
  setTimeout(() => { clearInterval(t); if (!acked) panel('page'); }, 2000);
}

// Keys typed into any field must never reach the shortcuts. e.target is retargeted to the shadow host, so a
// math-field (MathLive) or an input inside a plugin's shadow root looks like a plain element; walk the real path.
function typing(e) {
  for (const el of e.composedPath ? e.composedPath() : [e.target]) {
    if (!el || el === window || el === document) break;
    if (el.isContentEditable || el.matches?.('input,textarea,select,math-field,[role=textbox],[contenteditable]')) return true;
  }
  return false;
}

if (!window.__kitReviewBar) {
  window.__kitReviewBar = true;
  if (window.__kitHost) panel('host'); else if (window.parent !== window) agent(); else panel('page');
}
