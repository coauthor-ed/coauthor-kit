// WorkEnergyDeck - the chapter's arcade deck file, one file per chapter.
//
// This is the FIRST export in the file. A later lesson's game adds a NEW export
// beside it and never edits or reorders an existing item or export.
//
// Every item's `why` is the evidence line the why card shows, never a restated
// answer. `myth: true` marks what learners commonly get wrong.

/**
 * The sign of the work done by a named force, reached by running a situation
 * through a yes/no key. Every group is a leaf of that key.
 */
export const WORK_SIGN = {
  groups: [
    { id: 'positive', label: 'Positive work', tone: 3, why: 'the force, or part of it, points along the motion' },
    { id: 'zero', label: 'Zero work', tone: 5, why: 'nothing moved, or none of the force pointed along the way it moved' },
    { id: 'negative', label: 'Negative work', tone: 6, why: 'the force points against the motion' },
  ],
  items: [
    { name: 'Hands lifting a school bag', is: 'positive', why: 'the bag moves up, the way your hands push' },
    { name: 'Pushing a cart on the floor', is: 'positive', why: 'the cart moves the way you push, so the force and the motion agree' },
    { name: "The ball's push on her hands", is: 'positive', why: 'the hands are driven back, the way the ball pushes them: positive work on her' },
    { name: "Her hands' push on the ball", is: 'negative', why: 'her hands push back against the way the ball is moving' },
    { name: 'Lowering a bag to the floor', is: 'negative', why: 'the bag comes down while your hands still push up' },
    { name: 'Pushing a wall that stays put', is: 'zero', route: ['no'], myth: true, why: "you tire, but the wall's displacement is 0, so W = F x 0" },
    { name: 'Carrying a box: the upward push', is: 'zero', route: ['yes', 'no'], myth: true, why: 'your push is straight up and the motion is sideways: at right angles, so F x 0 along the force' },
    { name: 'Holding a heavy bag still', is: 'zero', route: ['no'], why: 'the bag does not move, so there is no displacement for the force to work through' },
  ],
  // For ArcadeRouteScene: every group is a leaf of this yes/no key.
  key: {
    ask: 'Did it move?',
    no: 'zero',
    yes: {
      ask: 'Is any of the force along the motion?',
      no: 'zero',
      yes: {
        ask: 'Same way as the motion?',
        yes: 'positive',
        no: 'negative',
      },
    },
  },
};

/**
 * The six forms of energy s06 and s07 name, reached by asking which form an
 * everyday object mostly carries. Mechanical is one umbrella: motion, height
 * and stretched shape all sit under it until L03 and L04 split them.
 * Nuclear is left out - nothing on this belt carries it.
 */
export const ENERGY_FORMS_BELT = {
  groups: [
    { id: 'mechanical', label: 'Mechanical', tone: 1, why: 'energy due to motion, height, or stretched elastic shape' },
    { id: 'thermal', label: 'Thermal', tone: 6, why: 'energy that makes things warm or flows because of a temperature difference' },
    { id: 'light', label: 'Light', tone: 3, why: 'radiant energy that travels across empty space and lets you see' },
    { id: 'sound', label: 'Sound', tone: 5, why: 'energy carried by vibrations through air, water, or solid material' },
    { id: 'electrical', label: 'Electrical', tone: 4, why: 'energy carried by the motion or position of electric charges' },
    { id: 'chemical', label: 'Chemical', tone: 2, why: 'energy stored in the chemical bonds of substances like food, fuel, or battery chemicals' },
  ],
  items: [
    { name: 'A moving cyclist', is: 'mechanical', why: 'the cyclist and bicycle are in motion, carrying mechanical energy of motion' },
    { name: 'A stretched spring', is: 'mechanical', why: 'the stretched spring stores elastic mechanical energy waiting to do work' },
    { name: 'A flying cricket ball', is: 'mechanical', why: 'the ball moves through the air, carrying mechanical energy that can do work on the stumps' },
    { name: 'A hot cup of tea', is: 'thermal', why: 'it is hotter than the surrounding air, so energy flows out as heat' },
    { name: 'An iron glowing warm', is: 'thermal', why: 'thermal energy makes the metal hot and warms its surroundings' },
    { name: 'A torch beam across a room', is: 'light', why: 'radiant energy travelling across empty space that lets you see' },
    { name: 'A campfire flame: its brightness', is: 'light', why: 'radiation travelling across the gap to your eyes, lighting the dark' },
    { name: 'Thunder rumbling after a lightning flash', is: 'sound', why: 'vibrations travelling through the air from the shockwave reach your ears' },
    { name: 'A ringing school bell', is: 'sound', why: 'the bell vibrates and sends sound waves travelling through the air' },
    { name: 'A lightning bolt', is: 'electrical', why: 'electric charges surging through the sky carry electrical energy' },
    { name: 'Current flowing through a lamp cord', is: 'electrical', why: 'charges moving through the copper wire carry electrical energy to the bulb' },
    { name: 'A torch battery on a shelf', is: 'chemical', myth: true, why: 'substances inside store energy in chemical bonds until a circuit connects them; it is not yet electrical current' },
    { name: 'A plate of food', is: 'chemical', why: 'energy is stored in the chemical bonds of the nutrients until digested' },
    { name: 'Petrol in a car tank', is: 'chemical', why: 'fuel stores chemical energy in molecular bonds until burned in the engine' },
  ],
};

/**
 * The chapter's three foundational formulas - the matching drill for L04's
 * review slide. Taught by L01 s07, L03 s04 and L04 s06; nothing from L06-L08
 * (no power, watts, kWh, levers, efficiency) reaches this deck.
 *
 * Four groups, so the engine's same-group distractors come first: the three
 * formulas meet one another, which is the whole discrimination. Answers are
 * kept short on purpose - the range skin's target plate is 146 px wide and
 * holds two lines at 12 px - and the sense each short answer drops is carried
 * by its `why` line, which the why card prints in full.
 */
export const CHAPTER_FORMULAS = {
  pairs: [
    { prompt: 'Work done by a force', answer: 'W = F x s', group: 'formula', why: 'work is force multiplied by displacement along the direction of the force' },
    { prompt: 'Kinetic energy of a moving body', answer: 'K = 1/2 m v^2', group: 'formula', why: 'kinetic energy depends on mass and grows with the square of speed' },
    { prompt: 'Gravitational potential energy', answer: 'U = m g h', group: 'formula', why: 'potential energy near Earth depends on mass, acceleration due to gravity, and height gained' },
    { prompt: 'Work (definition)', answer: 'A force acting along the motion', group: 'definition', why: 'work is only done when a force produces motion along that force, not across it' },
    { prompt: 'Kinetic energy (definition)', answer: 'Energy an object has from motion', group: 'definition', why: 'any moving body has kinetic energy, and it can do work as the body is brought to rest' },
    { prompt: 'Potential energy (definition)', answer: 'Energy stored by shape or position', group: 'definition', why: 'energy stored by lifting an object against gravity or by changing an elastic shape' },
    { prompt: 'Formula featuring speed squared (v^2)', answer: 'Kinetic energy (K = 1/2 m v^2)', group: 'clue', why: 'kinetic energy scales with speed squared, so doubling speed quadruples the energy' },
    { prompt: 'Formula that requires a vertical height (h)', answer: 'Potential energy (U = m g h)', group: 'clue', why: 'gravitational potential energy needs a vertical displacement h above the reference ground' },
    { prompt: 'Work stored against friction', answer: 'Not stored: it becomes heat', group: 'clue', myth: true, why: 'a box dragged along a rough floor has no position it would rather be in, so the work ends up as heat in the floor and the box (and a little sound)' },
    { prompt: 'Ball at the top of a vertical throw', answer: 'All potential, zero kinetic', group: 'clue', why: 'at the highest point the ball has momentarily stopped, so its speed is zero and K = 0' },
    { prompt: 'SI unit of work and energy', answer: 'Joule (J)', group: 'unit', why: 'one newton pushing one metre is one joule, and every form of energy is counted in it' },
    { prompt: 'One joule expressed in force and distance', answer: '1 N x 1 m', group: 'unit', why: 'a force of 1 N moving an object through 1 m is the work that one joule measures' },
  ],
};

/**
 * The chapter's myths, reached by calling each statement true or false.
 * True or false - for ArcadeJudgeScene. Half the pool is false: the six
 * misconceptions the chapters name, all flagged `myth: true` so the boss
 * round is built out of them.
 */
export const ENERGY_MYTHS = {
  statements: [
    { text: 'Friction destroys energy.', truth: false, myth: true, why: 'rubbing turns motion into heat in the surfaces and sound in the air; the total is unchanged' },
    { text: 'A simple machine can create extra work.', truth: false, myth: true, why: 'a small force goes further, but the load moves a matching distance less: force and distance trade off' },
    { text: 'A longer ramp needs less total work to raise a load.', truth: false, myth: true, why: 'ignoring friction, the gentler slope needs less force but over more of the ramp: W = F x s comes out the same' },
    { text: 'More power always means more energy was used.', truth: false, myth: true, why: 'power is work per second; a strong machine run briefly can use less energy than a weak one run all day' },
    { text: 'A perpetual-motion machine only needs better bearings to run forever.', truth: false, myth: true, why: 'smoother bearings cut the friction loss, never remove it, and heat must still leave the machine' },
    { text: 'Holding a ball still high above the ground does work on it.', truth: false, myth: true, why: 'the height stores energy from when the ball was lifted, but while it is held it does not move, so no force acts through a distance' },
    { text: 'Work done by a force can be negative.', truth: true, why: 'when a force points against the motion - brakes, a stopping hand, friction - the answer is below zero' },
    { text: 'Energy changes form but is never used up.', truth: true, why: 'count every form in an isolated system and the total is the same before and after' },
    { text: 'The joule measures both work and energy.', truth: true, why: 'work is energy handed over by a force, so both are counted in newton-metres: the joule' },
    { text: 'Doubling the speed quadruples the kinetic energy.', truth: true, why: 'kinetic energy goes as the square of the speed: K = 1/2 m v^2, so twice the speed is four times the energy' },
    { text: 'A machine with mechanical advantage above 1 lifts a load with less force.', truth: true, why: 'the effort arm is longer, so your push is geared up and the load rises a shorter way in exchange' },
    { text: 'Potential energy depends on mass, gravity and height gained.', truth: true, why: 'lift the same mass twice as high and the stored energy doubles; the route up makes no difference' },
  ],
};

/**
 * The chapter's three work/energy/force quantities and their units, reached by
 * asking what the quantity measures: work or energy carried, energy moved per
 * second, or the push or pull itself. L01 s07, L06 s03 and s04 have taught
 * every unit and phrase in it.
 */
export const UNITS_SKY_SORT = {
  groups: [
    { id: 'work_energy', label: 'Work or energy', tone: 1, why: 'force acting through a distance, or the capacity to do work; measured in joules' },
    { id: 'power', label: 'Power', tone: 3, why: 'rate of doing work or transferring energy per unit time; measured in watts' },
    { id: 'force', label: 'Force', tone: 6, why: 'a push or pull that can accelerate a mass; measured in newtons' },
  ],
  items: [
    { name: 'Joule (J)', is: 'work_energy', why: 'the SI unit of work and all forms of energy: 1 J = 1 N x 1 m' },
    { name: 'Kilojoule (kJ)', is: 'work_energy', why: '1000 joules; a metric multiple of the unit of work and energy' },
    { name: 'Newton-metre (N m)', is: 'work_energy', why: 'force multiplied by distance along its line (1 N x 1 m = 1 J), equivalent to the joule for work' },
    { name: 'Kilowatt-hour (kWh)', is: 'work_energy', myth: true, why: 'power multiplied by time (1000 W x 3600 s = 3.6 MJ) measures total energy consumed, not power' },
    { name: '3600 joules of work in an hour', is: 'work_energy', why: 'an amount of work done, a quantity of energy handed over, counted in joules' },
    { name: 'Watt (W)', is: 'power', why: 'the SI unit of power: one joule of work done per second (1 W = 1 J/s)' },
    { name: 'Kilowatt (kW)', is: 'power', why: '1000 watts; measures the rate of energy transfer, not the total energy' },
    { name: 'Joule per second (J/s)', is: 'power', why: 'work divided by time; the defining rate of energy transfer that equals 1 watt' },
    { name: 'Horsepower (hp)', is: 'power', why: 'an older unit of power equivalent to 746 watts, still used for engine ratings' },
    { name: 'Rate of doing work', is: 'power', why: 'how fast work is done or energy is transferred per unit time' },
    { name: 'Newton (N)', is: 'force', why: 'the SI unit of force: a push or pull that can accelerate a mass' },
    { name: 'Kilonewton (kN)', is: 'force', why: '1000 newtons; measures the magnitude of a force, not work or power' },
    { name: 'Kilogram-metre per second squared (kg m/s^2)', is: 'force', why: 'mass times acceleration (F = ma); the base-unit definition of the newton' },
    { name: 'Work divided by displacement (W / d)', is: 'force', myth: true, why: 'rearranging W = F x s gives F = W / s, with s the displacement: force, not power' },
  ],
};

/**
 * Everyday levers into the three classes, reached by asking which of the
 * fulcrum, load and effort sits in between the other two. s09 and s10.
 * The textbook's ambiguous "tongs" is left out on purpose: Table 7.2 files it
 * under both Class I and Class III.
 */
export const LEVER_CLASSES_BELT = {
  groups: [
    { id: 'class1', label: 'Class I', tone: 1, why: 'the fulcrum sits in between the load and the effort (Load \u2014 Fulcrum \u2014 Effort)' },
    { id: 'class2', label: 'Class II', tone: 2, why: 'the load sits in between the fulcrum and the effort (Fulcrum \u2014 Load \u2014 Effort)' },
    { id: 'class3', label: 'Class III', tone: 3, why: 'the effort is applied in between the fulcrum and the load (Fulcrum \u2014 Effort \u2014 Load)' },
  ],
  items: [
    { name: 'Scissors cutting paper', is: 'class1', why: 'the pivot screw sits in the middle, between your hand and the blades cutting the paper' },
    { name: 'A crowbar prying a stone', is: 'class1', why: 'the fulcrum rests on the ground between the handle you push down and the stone at the tip' },
    { name: 'A see-saw with two children', is: 'class1', why: 'the pivot support sits in the middle, between the two seats carrying the children' },
    { name: 'Pliers gripping a wire', is: 'class1', why: 'the hinge pin sits between your hand squeezing the handles and the jaws holding the wire' },
    { name: 'A wheelbarrow of soil', is: 'class2', myth: true, why: 'the tray of soil sits between the front wheel (fulcrum) and the handles you lift (effort)' },
    { name: 'A lemon squeezer', is: 'class2', why: 'the lemon sits in the cup between the end hinge (fulcrum) and the handles you press' },
    { name: 'A bottle opener', is: 'class2', myth: true, why: 'the tip rests on the cap as the pivot, the hook lifts the cap in the middle, your hand pulls the handle' },
    { name: 'A nutcracker', is: 'class2', why: 'the nut rests in the jaws in the middle, between the end hinge (fulcrum) and the handles you squeeze' },
    { name: 'A broom sweeping dust', is: 'class3', myth: true, why: 'the top hand is the pivot, the lower hand is the effort in the middle, the bristles push the dust below' },
    { name: 'Tweezers holding a bead', is: 'class3', myth: true, why: 'the arms join at the base (fulcrum), your fingers squeeze in the middle, the tips grip the bead' },
    { name: 'A fishing rod', is: 'class3', why: 'the butt rests against your body (fulcrum), your hand pulls in the middle, the line pulls the fish' },
    { name: 'A shovel lifting soil', is: 'class3', why: 'the top hand holds the end as a pivot, the lower hand lifts the middle, the blade carries the soil' },
  ],
};

/**
 * The stages of one mechanical-energy run, in the order they happen. s05 (a
 * swing whose height and speed trade places, and stop trading when air and
 * pivot loss are switched on), s10 (a ball whose peaks come back lower every
 * time, paid for out of the same account as heat and sound) and s11.
 * The why on a stage is the evidence for that stage; the engine shows the NEXT
 * stage's why after a wrong tap.
 */
export const RAMP_STAGES_TRAIN = {
  sequences: [
    {
      title: 'Ball down a smooth ramp: release to stop',
      items: [
        { name: 'On the ramp top: still', why: 'it is high up and has not moved yet: all of it is stored as height, U = mgh, with K = 0' },
        { name: 'Rolling down: speeding up', why: 'it is losing height the whole way, so the speed and the motion energy are both growing' },
        { name: 'Ramp bottom: fastest', why: 'the lowest point of the ramp, so the height it started with has become speed: for a sliding ball K = 1/2 mv^2' },
        { name: 'On the rough floor: slowing', why: 'friction pushes back against the motion, so it does negative work and the speed falls away' },
        { name: 'Stopped: heat and sound', why: 'nothing has been destroyed: the motion energy went into heat and sound in the floor and the ball' },
      ],
      why: 'the smooth ramp turns height into speed, and the rough floor then turns that speed into heat and sound',
    },
    {
      title: 'Swinging pendulum: one half-swing from release',
      items: [
        { name: 'Released at the top: still', why: 'the highest point of the arc and momentarily not moving: all of it is height, U = mgh, with K = 0' },
        { name: 'Swinging downward', why: 'it is falling, so height is being spent and speed is being bought with it' },
        { name: 'Bottom of the swing: fastest', why: 'the lowest point of the arc, where the height is smallest and the speed is greatest' },
        { name: 'Rising on the far side', why: 'it is climbing again, spending motion energy to buy the same height back' },
        { name: 'Opposite top: still again', why: 'back at the release height, so it has the same stored energy and the same zero speed' },
      ],
      why: 'in a swing with no loss, height and speed swap places and the lowest point is the fastest',
    },
    {
      title: 'Ball on a rippled track: first crest to final rest',
      items: [
        { name: 'First peak: released, still', why: 'the highest point of the track and zero speed: all of it is height, U = mgh' },
        { name: 'First valley: fastest', why: 'the lowest dip on the whole track, so the speed there is the greatest of the entire run' },
        { name: 'Second peak: lower', why: 'it climbed back up, but not as high as before: some of the energy was spent on the way' },
        { name: 'Third peak: lower still', why: 'every pass takes a little more out of the account, so the crests keep dropping' },
        { name: 'At rest: it ends in heat', why: 'the damping has taken the last of the mechanical energy; it is heat and sound now' },
      ],
      why: 'friction and air resistance take mechanical energy away each pass, so no crest ever reaches the height of the one before it',
    },
  ],
};

/**
 * Which simple machine an everyday tool is, reached by running it down the
 * decision key: a rigid bar on a fixed pivot, else a rope over a grooved
 * wheel, else a slope. L07 s04, s05 and s08, and the fulcrum idea s13 opens.
 * Every group is a leaf of that key. `myth: true` on the two learners get
 * wrong most: the screw and the wedge, seen as fasteners and cutting tools
 * rather than as slopes wrapped round something.
 */
export const WHICH_MACHINE = {
  groups: [
    { id: 'lever', label: 'Lever', tone: 1, why: 'a rigid bar pivoting on a fixed point or fulcrum to change or multiply effort' },
    { id: 'pulley', label: 'Pulley', tone: 3, why: 'a grooved wheel carrying a rope or cable to lift a load or change the direction of a pull' },
    { id: 'inclined_plane', label: 'Inclined plane', tone: 6, why: 'a sloping surface or wrapped slope that trades distance for reduced effort' },
  ],
  items: [
    { name: 'A crowbar prying open a wooden crate lid', is: 'lever', why: 'the rigid metal bar pivots on the edge of the crate to amplify the lifting force' },
    { name: 'A playground see-saw with two children', is: 'lever', why: 'a rigid plank rocking back and forth about a central pivot point' },
    { name: 'A bottle opener lifting a metal cap', is: 'lever', why: 'it pivots against the crown of the cap to prise the edge upward' },
    { name: 'A pair of scissors cutting paper', is: 'lever', why: 'two blades pivoting around a central connecting screw pin' },
    { name: 'A claw hammer pulling out a stubborn nail', is: 'lever', why: 'the curved metal head pivots against the wood surface as you pull the handle' },
    { name: 'A flagpole rope hoisting a flag', is: 'pulley', why: 'a rope running over a grooved wheel at the top turns a downward pull into an upward lift' },
    { name: 'A rope and bucket at a water well', is: 'pulley', why: 'a rope passing over an overhead grooved wheel to raise water from the shaft' },
    { name: 'A construction crane hoisting a steel girder', is: 'pulley', why: 'heavy wire cables routed through grooved sheaves to hoist the girder' },
    { name: 'A cord mechanism lifting window blinds', is: 'pulley', why: 'cords passing over small overhead rollers and wheels to raise the slats' },
    { name: 'A wheelchair ramp entering a public building', is: 'inclined_plane', why: 'a continuous sloping flat surface that trades distance for a reduced pushing force' },
    { name: 'A screw thread driven into wood', is: 'inclined_plane', myth: true, why: 'a spiral ridge is an inclined plane wrapped around a central cylinder' },
    { name: 'A wedge splitting a wooden log', is: 'inclined_plane', myth: true, why: 'two back-to-back inclined planes driven forward to force the wood fibres apart' },
    { name: 'A winding switchback road climbing a mountain', is: 'inclined_plane', why: 'a gentle gradient spread across a longer zigzag path to gain altitude with less force' },
    { name: 'A loading ramp into the back of a delivery truck', is: 'inclined_plane', why: 'a slanted plank that lets heavy crates be rolled up rather than lifted straight up' },
  ],
  key: {
    ask: 'Is it a bar rocking on a fixed pivot?',
    yes: 'lever',
    no: {
      ask: 'Does it use a rope over a grooved wheel?',
      yes: 'pulley',
      no: 'inclined_plane',
    },
  },
};
