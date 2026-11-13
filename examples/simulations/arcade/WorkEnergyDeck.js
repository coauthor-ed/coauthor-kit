// Work and energy decks for the arcade examples (grade 9 physics, "Work and
// Energy"). A deck is plain data; several games share one. Every `why` is the
// one-line reason the why card shows after a mix-up, so write it as evidence,
// not as a restated answer. `myth: true` marks an item students commonly get
// wrong: it is worth double in the boss round.

// Which energy does it mostly have (or give out)? - for ArcadeSortScene.
export const ENERGY_FORMS = {
  groups: [
    { id: 'kinetic', label: 'Kinetic', tone: 1, why: 'kinetic energy is energy of motion' },
    { id: 'potential', label: 'Potential', tone: 3, why: 'potential energy is stored by position or shape' },
    { id: 'heat', label: 'Heat', tone: 6, why: 'heat is energy that flows because of a temperature difference' },
    { id: 'sound', label: 'Sound', tone: 5, why: 'sound is energy carried by vibrations' },
    { id: 'chemical', label: 'Chemical', tone: 2, why: 'chemical energy is stored in the bonds of substances' },
  ],
  items: [
    { name: 'A rolling ball', is: 'kinetic', why: 'it is moving, so it has energy of motion' },
    { name: 'The wind', is: 'kinetic', why: 'moving air has energy of motion - it turns windmills' },
    { name: 'A flying cricket ball', is: 'kinetic', why: 'a moving ball can do work on the stumps' },
    { name: 'Water behind a dam', is: 'potential', why: 'it is high up: its position stores energy' },
    { name: 'A stretched rubber band', is: 'potential', why: 'its changed shape stores energy (elastic potential)' },
    { name: 'A book on a high shelf', is: 'potential', myth: true, why: 'it is not moving, but its height stores energy: it can fall' },
    { name: 'A wound-up toy car', is: 'potential', why: 'the wound spring stores energy until it is released' },
    { name: 'A hot iron', is: 'heat', why: 'it is hotter than its surroundings, so energy flows out as heat' },
    { name: 'Rubbing your hands', is: 'heat', myth: true, why: 'friction turns the work you do into heat - the energy is not lost' },
    { name: 'A ringing bell', is: 'sound', why: 'the bell vibrates and the air carries the vibration' },
    { name: 'A drum beat', is: 'sound', why: 'the skin of the drum vibrates the air' },
    { name: 'Food in your lunchbox', is: 'chemical', why: 'food stores energy in its substances until you digest it' },
    { name: 'A torch battery', is: 'chemical', why: 'a battery stores chemical energy and gives it out as electricity' },
    { name: 'Petrol in a tank', is: 'chemical', why: 'burning petrol releases the energy stored in it' },
  ],
};

// Is work done by the named force? - shared by a sort game and a key (route) game.
export const WORK_SIGN = {
  groups: [
    { id: 'positive', label: 'Positive work', tone: 3, why: 'the force (or part of it) points along the motion' },
    { id: 'zero', label: 'Zero work', tone: 5, why: 'no displacement, or the force is at right angles to the motion' },
    { id: 'negative', label: 'Negative work', tone: 6, why: 'the force points against the motion' },
  ],
  items: [
    { name: 'You lift a school bag: your pull', is: 'positive', why: 'the bag moves up, the way you pull' },
    { name: 'An apple falls: gravity', is: 'positive', why: 'gravity pulls down and the apple moves down' },
    { name: 'A horse pulls a cart forward', is: 'positive', why: 'the cart moves the way the horse pulls' },
    { name: 'You push a wall that stays put', is: 'zero', myth: true, why: 'you get tired, but the wall does not move: W = F x 0' },
    { name: 'You hold a heavy bag still', is: 'zero', myth: true, why: 'the bag does not move, so no work is done on it' },
    { name: 'You carry a bag across a flat floor: your upward push', is: 'zero', myth: true, why: 'your push is up, the motion is sideways - at right angles' },
    { name: 'Friction on a sliding box', is: 'negative', why: 'friction points backwards while the box slides forwards' },
    { name: 'Brakes on a moving bicycle', is: 'negative', why: 'the brakes push against the way the wheel moves' },
    { name: 'A ball thrown up, going up: gravity', is: 'negative', why: 'gravity pulls down while the ball moves up' },
    { name: 'A goalkeeper catches a shot: her hands on the ball', is: 'negative', why: 'her hands push back against the way the ball moves' },
  ],
  // For ArcadeRouteScene: every group is a leaf of this yes/no key.
  key: {
    ask: 'Does the object move?',
    no: 'zero',
    yes: {
      ask: 'Does part of the force point along the motion?',
      no: 'zero',
      yes: {
        ask: 'Same way as the motion?',
        yes: 'positive',
        no: 'negative',
      },
    },
  },
};

// Which class of lever? - a second key, for the rail skin.
export const LEVERS = {
  groups: [
    { id: 'first', label: 'First class', tone: 1, why: 'the fulcrum sits between the effort and the load' },
    { id: 'second', label: 'Second class', tone: 3, why: 'the load sits between the fulcrum and the effort' },
    { id: 'third', label: 'Third class', tone: 6, why: 'the effort sits between the fulcrum and the load' },
  ],
  items: [
    { name: 'A see-saw', is: 'first', why: 'the pivot is in the middle, a child at each end' },
    { name: 'A pair of scissors', is: 'first', why: 'the screw is the fulcrum, between your fingers and the paper' },
    { name: 'A crowbar lifting a stone', is: 'first', why: 'the fulcrum is between your push and the stone' },
    { name: 'A nutcracker', is: 'second', why: 'the nut sits between the hinge and your hand' },
    { name: 'A wheelbarrow', is: 'second', myth: true, why: 'the load is between the wheel (fulcrum) and your hands' },
    { name: 'A bottle opener', is: 'second', why: 'the cap is between the rim it pivots on and your hand' },
    { name: 'A pair of tweezers', is: 'third', myth: true, why: 'you squeeze in the middle; the hinge and the tip are at the ends' },
    { name: 'Your forearm lifting a cup', is: 'third', why: 'the muscle pulls between the elbow and the hand' },
    { name: 'A fishing rod', is: 'third', why: 'your lower hand is the fulcrum; the pull is in between' },
  ],
  key: {
    ask: 'Is the fulcrum between the effort and the load?',
    yes: 'first',
    no: {
      ask: 'Is the load between the fulcrum and the effort?',
      yes: 'second',
      no: 'third',
    },
  },
};

// Quantity <-> formula or unit - for ArcadeMatchScene.
export const FORMULAS = {
  pairs: [
    { prompt: 'Work done', group: 'formula', answer: 'force x displacement', why: 'work is the force times how far the object moves along it' },
    { prompt: 'Kinetic energy', group: 'formula', answer: '1/2 m v^2', why: 'it grows with the square of the speed' },
    { prompt: 'Potential energy near the ground', group: 'formula', answer: 'm g h', why: 'mass x gravity x height gained' },
    { prompt: 'Power', group: 'formula', answer: 'work / time', why: 'power is how fast work is done' },
    { prompt: '1 joule', group: 'unit', answer: '1 N moving 1 m', why: 'the unit of work: one newton over one metre' },
    { prompt: '1 watt', group: 'unit', answer: '1 J every second', why: 'the unit of power: one joule per second' },
    { prompt: '1 kilowatt hour', group: 'unit', answer: '3.6 million J', why: '1000 J each second for 3600 seconds', myth: true },
    { prompt: 'Mechanical advantage', group: 'formula', answer: 'load / effort', why: 'how many times a machine multiplies your force' },
    { prompt: 'Efficiency', group: 'formula', answer: 'work out / work in', why: 'a real machine always gives out less than you put in' },
  ],
};

// Put them in order - for ArcadeOrderScene.
export const ORDERS = {
  sequences: [
    { title: 'Hydro power: first to last', items: ['Water high in the dam', 'Water rushing down', 'Turbine spins', 'Generator turns', 'Electricity in the wires'], why: 'stored potential energy becomes motion, then electricity' },
    { title: 'A pendulum, from its highest point', items: ['At the top: all potential', 'Swinging down', 'At the bottom: fastest', 'Swinging up', 'At the other top: stops'], why: 'potential turns into kinetic and back again' },
    { title: 'Energy units: smallest to largest', items: ['1 joule', '1 kilojoule', '1 megajoule', '1 kilowatt hour'], why: '1 kWh = 3.6 MJ, bigger than a megajoule' },
    { title: 'Kinetic energy of the same ball: least to most', items: ['At 1 m/s', 'At 2 m/s', 'At 3 m/s', 'At 4 m/s'], why: 'KE grows with speed squared: 1, 4, 9, 16 times' },
    { title: 'A ball thrown up: first to last', items: ['Leaves your hand, fastest', 'Slowing as it rises', 'Stops at the top', 'Speeds up falling', 'Back in your hand'], why: 'kinetic turns into potential on the way up, and back on the way down' },
  ],
};

// True or false - for ArcadeJudgeScene. Most are myths students hold.
export const MYTHS = {
  statements: [
    { text: 'Holding a heavy bag still is work done on the bag.', truth: false, myth: true, why: 'the bag does not move, so no work is done on it (you still get tired)' },
    { text: 'Doubling the speed doubles the kinetic energy.', truth: false, myth: true, why: 'KE depends on speed squared: double the speed gives four times the energy' },
    { text: 'A ball at the top of its throw has no energy.', truth: false, myth: true, why: 'it has stopped moving, but it is high up: all its energy is potential' },
    { text: 'Friction destroys energy.', truth: false, myth: true, why: 'friction turns kinetic energy into heat; the total stays the same' },
    { text: 'A machine can give out more work than you put in.', truth: false, myth: true, why: 'a machine can multiply force, never work; some is always lost as heat' },
    { text: 'Work can be negative.', truth: true, why: 'when the force points against the motion, like friction or brakes' },
    { text: 'The joule is the unit of both work and energy.', truth: true, why: 'energy is the ability to do work, so they share a unit' },
    { text: 'Power tells you how fast work is done.', truth: true, why: 'power = work / time, in watts' },
    { text: 'A heavier stone on the same shelf has more potential energy.', truth: true, why: 'PE = m g h: more mass, more stored energy' },
    { text: 'A lever can let you lift a load with less force.', truth: true, why: 'with a longer effort arm it multiplies your force' },
    { text: 'Energy is used up when a bulb glows.', truth: false, myth: true, why: 'electrical energy turns into light and heat; none is used up' },
    { text: 'A body moving at constant speed on a smooth floor needs work to keep going.', truth: false, why: 'with no friction nothing slows it, so no work is needed' },
  ],
};
