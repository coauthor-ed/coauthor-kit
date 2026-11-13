# epi-curve@1

Epidemic curve: cases by day or hour of symptom onset, one box per case. Optional exposure line, incubation bracket, stacked groups, numbered notes.

## Use when

- Outbreak onsets over time: point source vs person-to-person, peak, incubation.
- Counts are small to medium (boxes show up to about 40 per bin; larger counts draw as solid bars).

## Not when

- Rates, cumulative counts, or two time axes: not an epi curve.
- The learner should move or test something: a scene.
- A timeline of studies or periods: built-in `timeline` layout.

## Data

- `bins` (3-60, in order, include empty bins): `{ label, count }`, or `{ label, counts: [..] }` with `series`. Labels unique, e.g. `12 Jun`, `08:00`.
- `series` (2-4, optional): `{ id, label, tone 1-5, step }`, stacked bottom first.
- `exposure`: `{ at: <bin label>, label, step }`. `incubation`: `{ to: <later bin label>, label, step }`, needs exposure.
- `notes` (max 3): `{ at: <bin label>, label, text, step }`, shown as numbered marks.
- `unit` (`day`|`hour`), `yTitle` (default Cases), `xTitle`.
- `step` (1-9, default 1) on bins, series, exposure, incubation, notes: the beat it appears. Not-yet bars are dashed outlines.

## Minimal

```json
{ "renderer": "epi-curve@1", "caption": "Onsets by day.",
  "data": { "bins": [ { "label": "12 Jun", "count": 2 }, { "label": "13 Jun", "count": 9 }, { "label": "14 Jun", "count": 4 } ] } }
```

Full example: example.json.
