# ZeroWorkCasesScene - design note

Status: done
Model: stealth/space-bunny-alpha[1m]
Base class: DomSimulation - the content is boxes and numbers (a definition, two dials, three readouts); nothing is drawn, and the brief asks for no frame loop, so the DOM component layer is the whole scene.
Layout: one `sim-card sl-backdrop` filling the frame (dotted backdrop, the bundle's DOM convention), title row (`sim-title` "W = F × s" + a static hint tag), then three `zw-row` cards, each a grid: caption (ticket tag + case name) | dial | readout, with a punched hole at each row's left edge - the row *is* a ticket, which is what the two free tickets are. Row 1 owns the force dial, row 2 the displacement dial, row 3 two greyed dials side by side plus a `locked` chip and their own values, in a 4-column grid. The note card sits in flow at the foot. Portrait collapses every row to one column.
Dials: in-card native `<input type="range">`, not control-bar sliders - the stub gives row 3 "both of its controls" and they have to read as greyed and locked *in the row*, which a control-bar slider cannot. `static CONTROLS = []`; this is logged as a control-bar deviation.

| beat | stage | shows | learner can | runs / events | enter() resets |
|---|---|---|---|---|---|
| 0 | the product, two live tickets | rows 1-2 with live dials and live readouts, each factor in the multiplication boxed in its own row's colour; row 3 present, both dials disabled and labelled, caption a dashed "?" | drag either dial; watch `F × s` re-multiply; drive either dial to 0 and see every readout fall to 0 J | no run: an `input` event recomputes immediately; the first move that takes a readout from non-zero to 0 J turns that row green, chips it `spent` and fires one confetti burst in it (the row is the burst host, so it must be `position: relative`) | `onStep` re-arms the `spent` flags for the new stage |
| 1 | the third ticket is named | row 3's caption pops in (`Neither factor is zero`) with a `Direction, not size` chip over its dashed unknown readout; its two dials still disabled, still reading 120 N and 3 m | keep driving either live dial; compare | same | same |

Both live rows print the **same** equation, `120 N × 3 m = 360 J`, with the factor that row's ticket is about boxed (row 1 boxes the force, row 2 the displacement). That is deliberate: the slide's claim is "no matter what the other one says", and one shared pair of dials with two boxed factors is what makes it visible in a single glance. Each factor carries **its own unit on every row** - `3 m × 120 N`, never `3 × 120 m`, which would read as 120 metres. Row 3's locked dials show the same 120 N / 3 m - both large, neither zero, the slide's own picture - and never compute.

Model numbers:
- Force dial 0-200 N, step 10 N, starts at 120 N (a reachable 0 at the first notch).
- Displacement dial 0-5 m, step 0.5 m, starts at 3.0 m (a reachable 0 at the first notch).
- `W = F × s`, integer joules, 0 J to 1000 J; the opening state is 360 J. The row's own factor is boxed, so "either factor" is a picture, not a sentence.
- Row 3's locked dials read 120 N and 3.0 m. No angle, no cosine, no non-zero angle, no signed value, no negative reading anywhere.

Celebrate: the moment a live row's readout lands on 0 J from a non-zero value - that is the concept being found (the ticket actually spends). Not on mount, not on a beat change, not on a Run. Both rows fire at once when one factor is zeroed, because that double-drop *is* the evidence for "either". The `spent` chip rides the ticket-tag row, so the celebration costs the row no height and the frame never has to grow.
Comes to rest: no frame loop at all. Nothing moves between events; the hint chip is static (no pulse) so the scene is at rest on load and after every input. The only timed work is the confetti burst, which removes itself when its last piece lands.
Plausible: the arithmetic is the slide's own definition with real units (N × m = J); a zero force dial is a formal way to hold a factor at zero, not a claim that a real push is zero-sized; a disabled dial is a lock in the teaching sequence, not physics, and is labelled `locked` so it is not read as a broken control.
Not shown: the angled case (L01 s05/s09) - row 3 is a lock, so there is no angle formula, no cosine and no non-zero angle number; the arithmetic of the third case, which is the next slide's job; energy, power, sign, and negative readings, none of which L01 has reached.

## Look log

Sheet each round: `build/shots/work-energy/L01/ZeroWorkCasesScene-sheet.png`.

- **round 1** (4-beat sheet both themes, full-size dark b0/b1 and a driven 0 N / 0 m state in each theme, calibration images first): text report `0 issue(s)` in both themes, so every defect below was one only the eye catches. seen - the confetti the note promised **never appeared**: `burst()` positions `.sl-burst` absolutely with `inset: 0` and `overflow: hidden`, and the host row was `position: static`, so the burst box measured 0px tall and every piece was clipped away (probed in a real browser: `.sl-burst` 184x0). The spent state grew each row by a wrapped `ticket spent` line, pushing the card past the declared height and cutting the foot line mid-sentence. Row 3's four grid children sat in a three-column grid, so `? J` fell to an orphan line under the caption and the whole right half of the row was empty. Both locked dials were unlabelled grey bars with no value and no `locked` mark - a broken control, not a lock. The own factor was accent-coloured but not boxed, so the claim the two rows exist to make was invisible, and row 2 printed `3 × 120 m` - the unit on the wrong factor, reading as 120 metres. No backdrop, and the foot line was the slide's own sentence re-set in the scene. changed - `position: relative` on `.zw-row` (the burst now measures 602x114 inside its row); the verdict shortened to `spent` so it rides the tag row at zero height cost and the spent state is the height of the idle one; row 3 given its own four-column grid with its dials' values (`120 N`, `3 m`) and a `locked` chip; every factor printed with its own unit on both rows and the own factor boxed in a real chip; `sl-backdrop` dots added (`SIM_LOOK_DOM_CSS`); the duplicated foot sentence dropped for an in-flow `noteCardHtml` that says what the model leaves out; punched holes and a `Direction, not size` chip on beat 1; the per-row caption lines gone (they were the slide's bullets again), which is most of the height the frame gave back.
- **round 2** (4-state sheet both themes, full-size dark b1 and light spent state): seen - the burst fires and reads as confetti over the ticket, the box on the own factor makes \"either\" a picture, the locked row's values and `locked` chip make the lock legible, both themes hold every reading, nothing is clipped or low-contrast, the spent state is unmistakable in one glance (`spent` chip, green row, green `0 J`, boxed `0 N`). changed - nothing; both remaining items are nits a third round would want to see, not defects.

open:
- Row 3's caption column is narrow enough that `Neither factor is zero` breaks to three lines, and its tag row stacks `ticket 3` over `locked`, so the locked row reads busier than the two live ones. Widening the caption track and putting `locked` on the same line as the name would even it out - a column change, and the 2-round budget is spent.
- The note card's accent border is the loudest edge in the frame, louder than the boxed factors it should be quieter than. A `--sim-stroke` border with the accent kept only on the `NOTE` badge would settle it.
- For about a second after a factor is zeroed the confetti crosses the `Force` / `Displacement` label. Transient and it clears itself; firing the burst from the readout column instead of the row would keep it off the label.

## Checks explained

`check-scene L01/ZeroWorkCasesScene --bundle work-energy`: PASS - 0 fail(s), 1 warning(s).

The one warning is the look pass's own punch hole - `abs-position: 1 left/top px position(s) ... (line 40)` - the one `left: 10px; top: 50%` on `.zw-row::before`. Left standing on purpose: it is a decorative 13px circle with no layout meaning, the rule it brushes is about positioning *content*, and the alternative (the same disc drawn as a `radial-gradient` on the row's background) is a pixel change the exhausted look budget could not verify. One `left/top` pair, deliberate, commented.

Three findings worth carrying to the next DOM scene in this bundle:

- **The sim-test harness DOM has no HTML parser.** `tools/sim-test/harness.mjs` `FakeElement` has no `innerHTML` setter and no parse step, so markup written by `render({ html })` never becomes a node tree and `querySelector` cannot find it. Every element lookup here is optional-chained (`this._dialF?.addEventListener`, `row.querySelector('.zw-j')` behind an `if`), so the scene is null-safe under sim-test and fully live in a browser. The shipped `examples/simulations/EvidenceCardsScene.js` only passes because it guards its one lookup with `if (this._record)` - same reason, hidden.
- **Height must be measured, never guessed - and the tallest *state* is not a beat.** First pass declared `HEIGHT = 330`; `sim-layout` measured the tallest beat at 515px landscape / 810px portrait and the frame was set to 530 / 828. The look pass then found the real clip: `sim-layout` never drives a dial, so the *spent* state - a taller card with the foot line cut in half - was invisible to it. After the fixes `sim-layout` measures 536px landscape / 901px portrait (still the clip FAIL against the old 530), and the frame is `HEIGHT = 560` / `PORTRAIT_HEIGHT = 920`, which also covers the spent state, which the verdict chip now keeps at idle height. A DOM scene with a state taller than its beats has to keep that state inside the *tallest beat's* box; `burst()`'s host also has to be `position: relative` or the confetti is clipped to nothing.
- **A row's grid must have a track for every child.** Row 3's four children in three columns is what orphaned `? J`; nothing in the text report said so, and `sim-layout` only caught it as an empty band.

## Requests

- The dials are in-card native `<input type="range">` with `static CONTROLS = []`, a deliberate control-bar deviation (already in the note above).
- The three `open:` nits above, all needing a round that can see the result.
