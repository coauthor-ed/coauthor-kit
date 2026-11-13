# Quill look: spec

Reference for the Quill look, the visual language of CoAuthor scenes (canvas, DOM, SVG). It grows from the Explorers half of the landing page (#/welcome). The rules a scene must meet are in `CARD.md` (on top of `docs/look-base.md`); this file explains them. Anchors: `SHOWCASE.md`.

Status: 2026-10-30, follows the card as approved that day.
Scope: scenes only. App chrome, plugins and Quill's choreography: coauthor docs/ui-ux-design-system.md. Lite/rich: docs/visual-profiles.md (the Quill look holds for both; rich adds light and material, never a different look).
Built: the LookProfile (`kit/looks/quill.js`, read with `lookOf()`) owns the shape and motion settings below (radius, rim, lip, gloss, card shadow, overshoot, celebration mode). A scene never sets them.

## 1. World and composition

- Layers, back to front: setting (low contrast), floor or ground line, hero, side cards, chips. Never a bare void, never riso paper by default (sec 5).
- Depth field: a microscopic or abstract subject may float on soft, out-of-focus, low-contrast depth with no floor. It is still a setting: quiet and lit, not a flat tint. Not for maths (sec 5).
- Setting contrast against the hero: setting at most 20% of the hero's tone contrast. If the setting draws the eye first, mute it.
- Hero in `ZONES.hero`; readings in side cards; chips at the edges, never on the evidence.
- Depth: 2-3 planes. Far planes are smaller, cooler and lower-contrast. Rich may add a slow parallax drift; lite stays still.
- Empty middle band = hero too small or off-centre. Fix the hero; never fill the gap with decoration.

## 2. Shape and material

| Part | Recipe |
|---|---|
| Body | flat fill of the role token |
| Cushion shade | the same token `darken(c, 0.18)` on the side away from the light, a soft-edged crescent, not a gradient |
| Highlight | one arc or bean of `lighten(c, 0.35)` near the top-left, about 1/4 of the body width |
| Rim | 2.5-4 px of `darken(c, 0.3)` (dark theme: `lighten(c, 0.15)` reads better on night) |
| Contact shadow | a flat ellipse of the floor tone, under anything that stands |
| Corners | radius >= 6 px on boxes; organic shapes via `blob()` with low wobble |
| Glass, liquid | `SimGlass` (approved material) |

Avoid: 1 px strokes, sharp polygons for living things, gloss strips on controls, photo texture, drop shadows that blur on every object.

## 3. Colour

Closed palette (`sim-theme.css`), no new tokens per scene.

| Role | Tokens |
|---|---|
| Setting | `--sim-bg-deep`, `--sim-bg-surface`, setting-specific (`--sim-sky-day`, `--sim-sea-deep`, ...) muted toward bg |
| Hero | its subject token (`--sim-mito`, `--sim-glass`, `--sim-map-land`, ...) at full saturation |
| Several things to tell apart | `--sim-series-1..8` and their `-ink` |
| Emphasis, the found thing | `--sim-gold` fill or `--sim-glow` halo; one at a time |
| Verdict | `--sim-good` / `--sim-bad`, always with a tick or cross, never colour alone |
| Frame accents (tabs, Next, current step) | app `--primary-color`, `--on-primary`, `--primary-hover` |

Rules: at most 3 saturated hues on screen plus gold. The hero gets the most saturated colour on screen. The setting never uses series colours.

## 4. Light: night and day

The same world under two lights. If the scene has its own time of day (a clock, a story beat), that time wins in both themes: only ink, chips and panels follow the theme. Maths has no night or day (sec 5).

| | Dark theme (night) | Light theme (day) |
|---|---|---|
| Setting | deep sky or deep room, a few dim stars or specks (rich: slow twinkle) | pale sky or lit room, no stars |
| Key light | soft pool of light behind the hero | sun-side highlight; floor shadow stronger |
| Glow | additive halo of `--sim-glow` / `--sim-gold` | becomes a soft tinted shadow plus a gold edge; never a white haze |
| Rims | lighter than the body | darker than the body |
| Ink | `--sim-label` (light) | `--sim-label` (dark) |

## 5. Settings by subject

Selected by `--sim-subject` / manifest `simSetting`; kit-owned, never drawn by the scene.

| Subject | Setting (night / day) | State |
|---|---|---|
| default | open sky over a low horizon: night with aurora band / day with pale band (`'sky'`) | built 2026-11-02 |
| chemistry | lab wall and bench (`'lab'`) | approved 2026-10-28 |
| biology | deep water with light shafts / clear shallow water (`'water'`) | built 2026-11-02 |
| geography | sky to ground, horizon at 2/3 / same in day (`'field'`) | built 2026-11-02 |
| history | warm evening wash with a parchment floor / daylight parchment (`'parchment'`) | built 2026-11-02 |
| maths | graph paper, flat, no texture, no glow (both themes) | approved 2026-10-27 |
| riso paper | `'riso'`, opt-in per course with `simSetting: "riso"` | approved 2026-10-27 |

## 6. Type, chrome, character

- Type: readings, titles and numbers in `--sim-font-display` (Fredoka 600-700); labels and sentences in `--sim-font` (Nunito 700-800). A key reading is 28-48 px. Kickers: 12-14 px caps, letter-spacing 0.12em, only on chips.
- Panels: rimmed card (`drawCard` / `sim-card`), radius 14-18, rim 2.5 px tone, no inner gloss.
- Chips, buttons, tabs: flat fill plus a solid 4-6 px lip of the darker tone; pressed = lip gone and 4 px down. Labels sit in chips, joined to their thing by a `leader`.
- Character: people via `SimFigure` (hands on what they hold), animals via `SimAnimal`, Quill via `SimMascotDom` (DOM only). Only where the subject has them: a person with hands on the work, or an animal. Never force one into a microscopic or abstract scene. A sidekick face (two eyes with a sparkle, a small mouth) is optional: a pot, a sun, a crystal that watches, never on the thing being measured or compared. Classes 9-12: friendly, not babyish; one sidekick face per screen.

## 7. Motion

- Arrivals: `outBack` scale or rise, 250-450 ms, staggered 60-90 ms. Leaving: plain fade, 150-200 ms.
- Ambient (rich, or a running process): slow bob, twinkle, drift; it must stop when the scene parks (`busy()`, CONTINUOUS rules).
- Emphasis: a glow pulse at most twice, then it holds.

## 8. Celebration

- Only at the find: the moment the learner finds the idea. Never when Run is pressed, never on a miss. Once per find.
- The scene calls its kit `celebrate()` (SimScene, GeoScene, SimSvg, SimLookDom) and draws no confetti or burst of its own.
- The kit shows a small ring and twinkles at the find (plus the verdict chip where the scene has one) and announces the find to the host. A found DOM or SVG element also pops 1.15x (`findPop`). Canvas has no element to scale, so no pop there: scaling a patch of the frame tears line art.
- Quill reacts from outside the scene: nod, clap, point (at the find) or twirl. The scene never draws Quill for this.
- Reduced motion: the end state and the verdict chip only, no pop.
- `celebrate()` at the find, never in a Run handler. `burst(host, n, at)`: pass the found element as `at`, or mark it `data-sim-found`; else the ring lands at the learner's last action in the scene (else the host's centre).

## 9. Showcase

See `SHOWCASE.md`.

## 10. Self-check before calling a scene done

1. Could a stranger say what the picture is about in 3 seconds, with the text hidden?
2. Is the hero the most saturated, best-drawn thing, near the centre?
3. Shade, highlight and rim on every object? No hairlines?
4. Both themes: night reads as night, day as day (or the scene's own time in both), no low-contrast labels?
5. If the subject has a person or an animal, is it there, hands on the work? Is the evidence free of faces?
6. Does only the find call `celebrate()`, with no confetti of the scene's own, and does everything come to rest?
7. Would it sit beside the SHOWCASE shots and the landing page without looking like a different app?

All checks green is required and not enough: judge the picture.
