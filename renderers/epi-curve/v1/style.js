/**
 * epi-curve stylesheet. Same family as the built-in figure (FigureLayouts.js
 * FIGURE_CSS): a ground panel with a ring, 13 px floor, kicker labels, the
 * casefile folder with its tab. Colours are --fig-* tokens only (the
 * casefile setting remaps them onto --fig-case-*); fonts are inherited from
 * the slide, except the casefile kicker, which uses --fig-font-mono like the
 * built-in figure does.
 *
 * The sheet is written with $name placeholders; css() swaps each for the
 * look's token (var(--fig-name)) or, in the casefile setting, the casefile
 * token (var(--fig-case-name)). No local custom properties: the kit lint
 * accepts --fig-* references only.
 */
const SRC = `
:host { display: block; width: 100%; }
* { box-sizing: border-box; }
.root {
  line-height: 1.4;
  text-align: left;
}
.root[data-setting="casefile"] {
  background: $desk; padding: 14px 14px 16px; border-radius: 4px;
}

.fig { color: $ink; background: $ground; border-radius: $r; padding: 16px 18px 14px; position: relative; }
.root[data-look="plain"] .fig { border: 1px solid $ring; }
.root[data-look="quill"] .fig { border: 2px solid $ring; }
.root[data-setting="casefile"] .fig { border: 0; margin-top: 24px; border-radius: 0 3px 3px 3px; box-shadow: 0 8px 18px $shadow; }
.root[data-setting="casefile"] .fig::before {
  content: attr(data-tab); position: absolute; left: 0; top: -24px; height: 24px; min-width: 64px; max-width: 100%;
  padding: 5px 14px 0; background: $tab; border-radius: 4px 4px 0 0;
  font-weight: 700; font-size: 13px; line-height: 1.2; letter-spacing: $kick-ls; text-transform: uppercase; color: $tab-ink;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.root.narrow .fig { padding: 12px 12px 12px; }
/* Casefile: the chart is a paper sheet in the folder (the folder ground is dark in dark mode). */
.root[data-setting="casefile"] .sheet { background: $card; border: 1px solid $edge; border-top: 3px solid $lead; border-radius: 2px; padding: 12px 14px 10px; box-shadow: 0 2px 6px $shadow; }
.root[data-setting="casefile"].narrow .sheet { padding: 10px 10px 8px; }

.kick { font-weight: 700; font-size: 13px; line-height: 1.2; letter-spacing: $kick-ls; text-transform: uppercase; color: $muted; }
.foot { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 16px; margin-top: 2px; }
.xtitle { font-size: 13px; line-height: 1.3; color: $muted; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 13px; line-height: 1.3; color: $ink; }
.legend span { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.legend i { display: inline-block; width: 12px; height: 12px; border-radius: 2px; }
.legend i.unit { width: 11px; height: 11px; border-radius: 1px; }
.legend .unit-key { color: $muted; }
.legend .ghost { visibility: hidden; }

svg.plot { display: block; width: 100%; overflow: visible; }
svg text { font-family: inherit; font-size: 13px; fill: $muted; font-variant-numeric: tabular-nums; }
.grid { stroke: $rule; stroke-width: 1; }
.base { stroke: $edge; stroke-width: 1.4; }
.tick { stroke: $edge; stroke-width: 1; }
.ytl { text-anchor: end; }
.xtl { text-anchor: middle; }
.ytitle { font-weight: 700; letter-spacing: $kick-ls; fill: $muted; }
.leader { fill: none; stroke: $sig; stroke-width: 1.4; }
.leader-dot { fill: $sig; }
.nb { fill: $sig-tint; }
.nb-edge { fill: $sig; }
.nb-k { font-weight: 700; letter-spacing: $kick-ls; fill: $sig; }
.nb-t { fill: $ink; font-variant-numeric: normal; }
.inc-head { fill: none; stroke: $lead; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.cell { stroke: $paper; stroke-width: 1; }
.ghostbar { fill: none; stroke: $ghost; stroke-width: 1.4; stroke-dasharray: 4 3; }
.bin.in { transform-box: fill-box; transform-origin: 50% 100%; animation: grow 0.5s cubic-bezier(.2,.7,.2,1) both; }
@keyframes grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }

.exp-line { stroke: $sig; stroke-width: 1.8; stroke-dasharray: 5 4; }
.exp-dot { fill: $sig; }
.exp-label { font-weight: 700; letter-spacing: $kick-ls; fill: $sig; }
.inc-path { fill: none; stroke: $lead; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.inc-label { font-weight: 600; fill: $lead; }
.inc-halo { fill: $paper; }
.mark circle { fill: $sig; stroke: $paper; stroke-width: 2; }
.mark text { fill: $card; font-weight: 700; text-anchor: middle; font-variant-numeric: normal; }
.hide { visibility: hidden; }
.in-fade { animation: rise 0.3s ease-out both; }
@keyframes rise { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

.notes { display: grid; gap: 8px 12px; margin-top: 10px; }
.note { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 0 8px; align-items: start; background: $sig-tint; color: $ink; border-left: 3px solid $sig; padding: 7px 10px 7px 8px; font-size: 13.5px; line-height: 1.32; border-radius: 0 $r $r 0; }
.note .n { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 11px; background: $sig; color: $card; font-weight: 700; font-size: 13px; line-height: 1; }
.root[data-setting="casefile"] .note .n { border-radius: 2px; }
/* Casefile kicker face: the typewriter mono, as the built-in figure. */
.root[data-setting="casefile"] .fig::before, .root[data-setting="casefile"] .kick, .root[data-setting="casefile"] .exp-label, .root[data-setting="casefile"] .ytitle, .root[data-setting="casefile"] .nb-k,
.root[data-setting="casefile"] .note b, .root[data-setting="casefile"] .note .n { font-family: var(--fig-font-mono); }
.note b { display: block; color: $sig; font-weight: 700; font-size: 13px; line-height: 1.2; letter-spacing: $kick-ls; text-transform: uppercase; margin-bottom: 2px; }
.note.ghost { visibility: hidden; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
.root.still *, .root.still *::before, .root.still *::after { animation: none !important; }
`;

/** Tokens: the look's --fig-*, or --fig-case-* in the casefile setting. */
export function tok(name, casefile) {
  return casefile ? `var(--fig-case-${name})` : `var(--fig-${name})`;
}

export function css(look, casefile) {
  return SRC.replace(/\$([a-z][a-z0-9-]*)/g, (m, name) => {
    if (name === 'kick-ls') return look === 'plain' && !casefile ? '0.12em' : '0.08em';
    if (name === 'r') return casefile ? '2px' : 'var(--fig-r, 6px)';
    if (name === 'paper') return tok(casefile ? 'card' : 'ground', casefile);
    return tok(name, casefile);
  });
}
