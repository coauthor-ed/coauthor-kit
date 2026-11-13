# Narration: a teacher presenting the slides

Audio narration of a lesson, built at authoring time. Learned from the analytical-epidemiology course (2026-11: pilot les-01, then les-00..05 through four owner reviews and a college lecturer's classroom use). Build commands, sidecar format: engine repo `tools/narration/README.md`. Run per lesson: `briefs/stageN-narration.md`.

## 0. Where it sits in the pipeline

- Narration is its own stage (N), one lesson per run, AFTER the lesson's scenes are `done` and its prose is final (Stage 3-slides passed). A prose or scene change after narration means a re-check (sec 11) and a rebuild of the changed beats only.
- A course that will be narrated says so up front: COURSE-BRIEF, then the OUTLINE header `Narration: narrated` (Stage 1b). Then Stages 1b, 2 and 3 build narration-ready (sec 13). Retro-fitting cues and tags into finished scenes cost more than the script.
- The agent writes the script, the cues and the scene tags. Audio is built by the operator (or by the agent only when the invocation says `Audio: build`): edge-tts needs the network. The operator checks the prerequisites with `node tools/operator/doctor.mjs --narration [--install]`.

## 1. Opt-in, voices, mode

- A course ships with NO narration. The author chooses to build it, per lesson (`narrationRef` on the lesson).
- One voice (Andrew, the default) or two (Andrew + Neerja): `--voices`. Two voices = a Voice button for the learner. One voice = no button.
- Script: `narration/les-NN.script.json`. Every spoken beat gets a `say`. Slide text is a fallback only; never ship it (narration-lint NO-SAY).
- Narration-first course: manifest `"narration": { "preferredMode": "narrated" }` (the operator sets it at publish). Its narrated lessons open narrated (Play ready) until the learner picks a mode in that course; then their last pick wins.
- The same narrated lesson serves self-study AND a lecturer presenting in class (sec 10a). Write for both: one idea per beat, the visual change in cues.

## 2. Voice: a teacher, not text-to-speech

- Write what a teacher says while the slide is up. Explain, connect, point. Never read the slide out.
- Plain words, full sentences, no idiom, no aphorism (`voice-and-tone.md` Reader). "A number that moves when the investigator changes the design is not a property of smoking" confused learners; say plainly what to compare and why. 120-180 words a minute; a beat of 20-60 s.
- Same facts as the slide. Never add a number, name or claim the slide does not carry.
- Lines the slide says to the reader as text ("Nothing moves until you drag", "Select a row") are not spoken as is: either the narrator does it (cue) or asks the learner and waits.
- Glue between slides is welcome ("Back to the Boston file."). A recap of the slide is not.

## 2a. Teach in the voice: define, derive, name

A narrated learner never opens the glossary and never reads the prose. So:
- Define every term the first time it is spoken in the course, in the `say`, with this slide's numbers: "The exposure rate is the share who were exposed: fourteen of the twenty cases smoked, seventy per cent." A glossary entry alone fails (owner: "exposure rate", "P value" were explained in text mode only). narration-lint lists first-spoken glossary terms (`note: TERMS`): check each.
- A number on screen that the learner must trust is derived on screen and in the voice, step by step: where each cell of a table comes from, what is fixed and what the slider changes. "It is not clear how the numbers of the table are derived" was a review failure.
- Name the move before the learner makes it, and what it will show. Never ask for a move whose effect the picture cannot show.
- The course's invented names must not mislead out loud: a plastics plant's "reactor" was heard as nuclear; it became "tank". Check every invented noun once for a stronger everyday meaning. Keep internal ids stable when a word changes; re-voice only the beats that say it.

## 3. Headings

- Never spoken. The engine fades the slide title in (about 3 s) where there is room.
- Do not start a beat by restating the title in other words (narration-lint HEADING).

## 4. Never talk past the screen

Every beat that points at something ("look at", "the bars", "the table", "here is", "on the screen") or asks the learner to act ("tap", "drag", "pick", "try", "watch") does ONE of:
1. **Cue** it: `[[cue-id]]` just before the word that names the thing. The scene does it in sync, with the same visible change a learner's tap gives. Best: demonstrate, then hand over.
2. **Wait** for it: `"await": "interact"` + `"hint"` (sec 6).
3. **Opt out**: `"noScreenRef": "<reason>"`, only when nothing needs driving (sec 8).

narration-lint and check-narration fail a DEICTIC beat (pointing or acting words with no cue, no await, no opt-out). Fix the beat, do not reword to dodge the lint.

## 5. Scene cues

- Mix in the kit helper: `import { withNarrationCues } from 'simulations/base/kit/SimNarration.js'`; `class X extends withNarrationCues(SvgScene)`. Implement `static CUES`, `applyCue(id, ms)`, `cueBase()`, `cueReset(base)`. It makes the scene `SEEKABLE` and gives `this.interactDone(id)`.
- Replay, scrub back and Previous must re-derive the picture from the beat time: the helper drops cue effects and re-applies logged cues up to the new time. Test a scrub back to before the first cue.
- A cue is the teacher's hand: ring or light the part named, flip the switch, move the handle, open the row. Keep it visible until the next cue or beat.
- A cue move never counts as the learner's. Never call `interactDone` from a cue.
- Beat-synced scenes (`onStep` per beat) change at the beat's START. Say that change in the beat's first sentence, so words and picture agree. A cue is for a change later in the beat, at its word.
- Frozen beats: a cold landing (deep link, Previous, resume) shows the beat's finished picture; arriving by Next shows the previous picture with the move waiting for the learner or its cue.
- The picture agrees with the words at each word: counts too ("twenty women" with seven dots on screen was a defect).
- Write the cue ids and effects in the scene header comment, with a `Completion:` line (sec 6) and a `Narration focus ids:` line.

## 6. Waiting for the learner (await interact)

Two kinds. Decide per wait; most are exploration.
- **Exploration** (default; `"free": true` says the same): the box says "Your turn. Narration paused." + your `hint` + Done + Skip. Only Done or Skip go on; scene signals and time never do. Use it for anything open: try the slider, switch the tabs, compare cases, show the controls. Owner: narration that moved on after one click "did not give the learner time to explore".
- **Closed** (`"closed": true`): a task with an end the scene detects (all five parts in, the switch flipped there and back). The scene's signal shows "Got it" for 2 s and goes on. Only when the beat asks for nothing after the task. Needs a scene that calls `interactDone`.
- Done = the learner FINISHED and saw the result. Send it from an end-of-gesture event (click; `change` or pointer up for sliders and drags), never `input`, pointermove or the first touch; only after a real change by the learner.
- `hint`: the task in under 10 words, imperative ("Open each row of the table."). Say the same task in the `say`, last.
- Every control the voice asks the learner to use changes something visible that the voice named ("Tap any step, and see which people it is about": tapping changed nothing; fixed by lighting that step's people). If it changes nothing, cut the ask.
- One wait per beat, at its end. Do not ask for two tasks in one beat.
- Asking for a task the beat's scene state does not allow (control hidden, wrong step, a card covering it) strands the learner. Check the scene's step for that beat.
- A `mini-game@1` releases its wait on solve. It does NOT pass narration cues to its scene: anything the voice must light step by step (a derivation, a table build) belongs in a content-block scene, not in the game.

## 7. Questions and predicts

- The prompt is spoken, in the teacher's words; options are never read (narration-lint READS-OPTIONS). The engine adds `await: "answer"`.
- While the prompt plays, the card (question, predict, exercise, game) is hidden; it shows at the prompt's last phrase. So the last sentence of the prompt is the ask itself, short: "Which reading is fairest?" Nothing after it (narration-lint PROMPT-ASK).
- A prompt that points at the card ("On the screen are four claims", "The table records"): put `[[show.options]]` (or `[[show.card]]`) before those words. The card shows there.
- Predict: the options show after the prompt, the pacer waits for the prediction. With `deferVerdict` the verdict is shown at the top of the next slide.
- After any answer the pacer holds on the feedback until Continue. Do not say "the answer is" in the next beat as if no feedback was read; refer back ("You predicted ...", "As the feedback said ...") only when the slide does.
- A numeric question: say what to give and how ("to one decimal place").

## 8. Renderers, tables, figures, graphs

- Speak the gist: what the table shows, which cells matter, what it means. Never read cells row by row.
- A table the voice walks through: tag EVERY cell, margin and total it can name (`a`, `b`, `c`, `d`, `col1`, `n`). A sum lights all its parts: "a plus c" = `[[focus.a+c]]` (both cells, and the margin if shown). Owner: cells named in the voice and not lit were a defect.
- A graph or figure that reveals its part with the beat (`revealAt`, `step`) is beat-synced: name what appears, then opt out with `noScreenRef` ("graph points reveal with this beat").
- Focus cues (any picture): `[[show.<id>]]` keeps the part hidden from the beat start, then shows it lit at that word. `[[focus.<id>]]` lights it and dims the rest. `[[focus.none]]` clears the light. `[[focus.rest]]` dims all, lights nothing (narration off the picture). `[[focus.all]]` clears dim and shows all. Join ids with `+` (`focus.cases+controls`). Effects last to the end of the beat. Scrub-safe.
- Ids: a `figure` field: item ids, `gate`, `after`, `aside` (a bare `[[<itemId>]]` works too). A graph or diagram step figure: series or item ids. A DOM/SVG scene: tag parts in the scene markup, `data-narr="id"` (several ids: space-separated); no scene code. Built html: kit `SimNarration.js` `na(id)`, `tagFirst`, `tagTop`, `tagEach(html, 'td', ids)` (table cells), `tagEl`, `tagLive` (SimCrowd dots). Do not nest tags, except a lit part inside its group. Tag `data-narr-hide` on parts never spoken (legend, readout, chips): hidden while narrated. A canvas scene or renderer: implement `narrationFocus({narrated, on, held})`.
- Lit glow vs data colour: the engine glows a lit SVG part in the signature colour. Where colour IS data (blue = case), the glow reads as data: call `narrOn(this, f)` from `narrationFocus(f)` and add `narrKeepColourCss(ids, sel)` to the scene css (kit `SimNarration.js`).
- Do not tag empty placeholders ("-" rows): an outlined empty row reads as a defect.
- Allowed opt-outs: figurative "look at"; the beat's own reveal; a picture on an earlier slide; a beat-synced picture. Anything else: cue or wait. Re-read every `noScreenRef` after a scene change: "text slide, no scene" goes stale when the slide gains a scene (narration-lint STALE-OPTOUT).

## 8a. Focus: show only what is spoken (owner rule: de-clutter, focus, highlight)

Narrated and playing, the learner sees the spoken phrase (current word lit), the part being spoken about, and little else. Narration off is unchanged.
- The engine does text and page furniture: one phrase in the caption, prose hidden while playing, header and strip fade while the learner only listens. Pause, Read instead and Full text bring it all back. Nothing to author.
- The author does the picture. Each beat of a scene or figure slide: what is on screen at its first word must be what the first sentence speaks about. Anything spoken later: `show.` it at its word. Anything spoken about but already there: `focus.` it. Anything never spoken: `data-narr-hide`, or cut it.
- A beat with focus cues starts dimmed until its first cue. Put the first one on the first word that names a part.
- One lit thing at a time. Two only when the sentence compares them.
- Do not hide what a wait asks the learner to use. End the beat with `focus.all` before an `await` (narration-lint WAIT-FOCUS).
- Check: frames at each cue, 1280x720 and 390x844. Nothing on screen the narrator has not reached.

## 8b. Never open on words alone

A beat whose first phrases play over an empty stage or a bare caption reads as a radio. The owner flagged 16 such openers in one course.
- Slide with a scene: put the scene on screen from the first word, dimmed (`focus.` cues, not `show.`), and light parts as they are named. `show.` only for a part that must not be seen early.
- Lesson opener, predict prompt, prologue, or a slide whose subject the scene cannot show (the setting, the people, the place): an opening picture: `narrationCover` on the block (content-block@1 or poe-predict@1; key = step id, or `prompt` on a predict): `{ "b1": { "src": "media/01-desk.jpg", "alt": "...", "frames": [ {"x":0,"y":0,"w":1,"h":1}, {"x":0.4,"y":0.2,"w":0.4,"h":0.4,"cue":"files"} ], "until": "scene" } }`. The camera zooms and pans at each frame's cue; the cover fades at `until` and the scene takes over. Narrated only.
- Images: 5-6 per course, reused across openers with different frames. The author never generates them: list each with a prompt in `courses/<Bundle>/IMAGE-PROMPTS.md` (subject, framing 16:9, no text in the image, the look's palette) and leave the cover out until the human supplies the file (JPEG 1344x768, about 150 KB). Never a raw PNG.
- No picture at all fits: a large headline phrase on the stage is the last resort; flag it.
- narration-lint BARE-OPENER flags a first beat with 12+ words before anything is shown.

## 9. Lexicon and numbers

- Respellings in `narration/lexicon.json` (all voices) and `lexicon.<voice>.json` (one voice). TTS input only; captions keep the real word.
- Digits are spelled by the tool. In the script prefer words: "nineteen sixty-one", "fourteen of the twenty" (narration-lint DIGITS).
- Say decimals and units as a teacher would: "twenty-six point one years", "per cent". Long intervals ("zero point eight five to two point four five"): one per sentence.
- Letters and symbols: "a plus c", "b plus d", "two by two table". Never leave "2x2", "a+c", "=", "%" or "n.s." to the TTS (narration-lint SYMBOLS).
- Abbreviations: say the full term the first time ("diethylstilbestrol, or D E S"), then the letters spaced ("D E S").
- Neerja (en-IN Expressive) known bad words: colleague, born, rare (intermittent), bare, sixty-one. They are respelled in `lexicon.neerja.json`; add to it, never edit the shared script for one voice. Copy that file from an earlier narrated course.
- Names and foreign words: add a respelling the first time they appear, then listen.

## 10. Slide breath

- The engine pauses 700 ms when narration moves to a new slide by itself. Nothing to author. Do not add "Now," "Next," fillers to fake a pause.

## 10a. Presenter mode (lecturer in a classroom)

Engine feature; nothing to author. Narration bar: screen icon = Presenter mode (phone: More menu). Off by default, kept per profile. Self-study is unchanged when off. A lecturer asked for it: the text-mode slide is "distracting"; the narrated view's centring, animation and synced visuals are what they present with, muting the voice to speak themselves.
- Presenter on: narration holds at the end of every beat (visuals at the beat's end) until Next or Play. Question, exploration and feedback waits work as in self-study.
- Mute (speaker icon, key M, both modes): sound off, timeline runs; highlight, captions, cues and focus keep time.
- Keys (keyboard or presentation remote/clicker), narrated mode only, never while a text box, slider or other arrow-key control has focus: Space play/pause; PageDown, Right (presenter: also Down) next beat; PageUp, Left previous; M mute; B or . blank; C captions; F5 full screen; ? key list.
- Authoring consequence: every beat is a presenter click. Keep beats one idea long, and put the visual change of a beat in its cues, so a beat skipped with Next still lands in the right picture.

## 11. Checks before you hand over

1. `node tools/narration-lint.mjs --bundle <B> <L0N>` (kit, no audio needed): PASS; read every WARN and the TERMS note.
2. `check-scene` 0 FAIL on every scene you touched; `node --check` each file.
3. After the audio build (operator): engine `node tools/narration/check-narration.mjs <bundle> lessons/les-NN.json`: 0 problems (no STALE, MISSING, META, DEICTIC). `--verbose` lists your opt-outs: read each reason.
4. Real app, headless, narrated, real audio at 1.5-2x, 1280x720 and 390x844: every beat plays; each cue changes the scene at its word; scrub back restores; pause then play resumes at the paused word; each wait shows Your turn and releases only as sec 6 says; predict and questions wait and hold on feedback; 0 page errors. Serve with the engine's `tools/serve-local.py` or `tools/narration/listen-server.py` (they answer audio Range requests; a server without Range makes every resume restart the beat).
5. Listen to at least one beat per scene in each voice before you call it done.

## 12. Mistakes we made (do not repeat)

- Read the slide text aloud. Felt robotic. Write a teacher script.
- Spoke headings. Never.
- Said "flip the switch" and kept talking. Every on-screen reference is cued or waits.
- Released a wait on the first slider input, then on the first click of an exploration. Exploration waits end on Done.
- Asked "tap any step" where tapping changed nothing.
- Waited on a scene that sends no signal. The learner was stuck until Skip.
- Read a table cell by cell; then named cells without lighting them. Give the gist and light what is named.
- Opened 16 beats on words over an empty stage.
- Used a term (exposure rate, P value) only the glossary defined; showed table numbers with no derivation.
- Built a confusing scene: a filled dot meant different things in different views, buttons did not say what they do, a red verdict line did not say why. One encoding for the whole scene, legend in words, each button says its effect in one sentence.
- Kept a "text slide" opt-out after the slide gained a scene.
- Built from an old tool: a predict prompt had no segment, so the question was silent. Rebuild after any tool or script change; check-narration catches STALE.
- Kept the slide line "Nothing moves until you drag" in a beat whose cue moved the handle. Say what happens.
- Picked a voice before hearing it in the lesson. Owner ears decide; ship samples, not opinions.

## 13. Narration-ready from the start (Stages 1b, 2, 3)

When the OUTLINE header says `Narration: narrated`:
- 1b: a course with a frame (a detective case, a running investigation, a cast role like "Senior investigator") opens with a short prologue lesson `L00` (2-3 slides): who the learner is, who the voices on the slides are, the case and the steps ahead, what is real and what invented. Plan an opening picture for every lesson opener and predict (sec 8b).
- 2: prose defines each term where first used and derives each number it shows (sec 2a); a button's label says its effect. Each stub lists `Narration:` the parts the voice will name (ids) and the moves the teacher will demonstrate (cues).
- 3: scenes extend `withNarrationCues`, tag every nameable part with `data-narr` (each table cell, margin and total, each group, the legend parts), declare `static CUES` for the demonstrated moves, call `interactDone` per sec 6, and carry the header lines of sec 5. `briefs/reference/scene-rules.md` "Narrated courses".

Worked example (script, scene cues and tags, cover): `examples/narration/README.md`.
