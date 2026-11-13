// Known misses: [query, module expected in the top 3]. Every reported miss adds a line here
// AND the missing synonym in kit-catalog.mjs. look-kit-check (section 26) runs them.
export const CASES = [
  ['draggable fulcrum, level the beam', 'SimBalance.js'],        // Stage 3 run 2026-10-01 (missed SimBalance, built BeamDraw)
  ['seesaw tilts to the heavier side', 'SimBalance.js'],
  ['drag a handle and snap to a value', 'SimDrag.js'],
  ['hand-drawn axis with fraction ticks', 'SimNumberLineCanvas.js'],
  ['area model of multiplication tiles', 'SimGeomCanvas.js'],
  ['roll a die many times and watch the frequency settle', 'SimChanceTrials.js'],
  ['timeline with BCE dates and eras', 'SimTimelineCanvas.js'],
  ['students sitting at desks in a classroom', 'SimProps.js'],
  ['a crowd of people queueing', 'SimFigure.js'],
  ['pulley and spring balance experiment', 'SimProps.js'],
  ['map of India with state boundaries', 'GeoMap.js'],
  ['learner guesses before the result is shown', 'SimPredict.js'],
  ['parliament seats hemicycle after an election', 'SimChart.js'],
  ['cause and effect chain with arrows', 'FlowBoard.js'],
  ['a dog walking', 'SimAnimal.js'],
  ['sort falling items into bins against the clock', 'ArcadeSortScene.js'],
];
