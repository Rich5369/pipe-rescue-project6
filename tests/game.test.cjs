// Run with node tests/game.test.cjs. No browser libraries or dependencies needed.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Element {
  constructor() { this.children = []; this.style = { setProperty() {} }; this.dataset = {}; this.classList = { add() {}, toggle() {} }; this.open = false; }
  addEventListener(type, callback) { this.listeners ??= {}; this.listeners[type] = callback; }
  click() {
    if (this.disabled) return;
    const event = { target: this, preventDefault() {} };
    this.listeners?.click?.(event);
    documentListeners.click?.(event);
  }
  closest(selector) { return selector === 'button' ? this : null; }
  setAttribute(name, value) { this.attributes ??= {}; this.attributes[name] = value; }
  focus() {}
  querySelector() { return new Element(); }
  replaceChildren() { this.children = []; }
  append(child) { this.children.push(child); }
  showModal() { this.open = true; } close() { this.open = false; }
}
const elements = new Map();
const documentListeners = {};
const scheduled = new Map();
const playedFrequencies = [];
let timeoutId = 0;
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  createOscillator() {
    return {
      frequency: { setValueAtTime: (frequency) => playedFrequencies.push(frequency) },
      connect() {}, start() {}, stop() {}
    };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
  }
}
function flushTimeouts() {
  const pending = [...scheduled.keys()];
  pending.forEach(id => {
    const callback = scheduled.get(id);
    scheduled.delete(id);
    if (callback) callback();
  });
}
let tick;
let now = 1000;
const context = vm.createContext({
  console, Math, Set,
  Date: { now: () => now },
  AudioContext: FakeAudioContext,
  document: {
    getElementById: (id) => {
      if (!elements.has(id)) {
        const element = new Element();
        element.id = id;
        elements.set(id, element);
      }
      return elements.get(id);
    },
    querySelectorAll: () => [],
    createElement: () => new Element(),
    addEventListener: (type, callback) => { documentListeners[type] = callback; }
  },
  setInterval: (callback) => { tick = callback; return 1; }, clearInterval() {},
  setTimeout: (callback) => { scheduled.set(++timeoutId, callback); return timeoutId; },
  clearTimeout: (id) => scheduled.delete(id)
});
vm.runInContext(fs.readFileSync('script.js', 'utf8'), context);
const run = (code) => vm.runInContext(code, context);
elements.get('start').click();
assert.ok(playedFrequencies.includes(520), 'Button clicks play a sound');
elements.get('sound-toggle').click();
assert.equal(elements.get('sound-toggle').attributes['aria-pressed'], 'false');
const mutedSoundCount = playedFrequencies.length;
elements.get('start').click();
assert.equal(playedFrequencies.length, mutedSoundCount, 'Turning sound off silences button clicks');
elements.get('sound-toggle').click();
assert.equal(elements.get('sound-toggle').attributes['aria-pressed'], 'true');
assert.ok(playedFrequencies.length > mutedSoundCount, 'Turning sound back on plays its button sound');
run('score = 499; updateMilestones(0);');
assert.equal(elements.get('milestone-message').hidden, true);
run('score = 500; updateMilestones(499);');
assert.ok(elements.get('milestone-message').textContent.includes('first milestone'));
run('score = 1500; updateMilestones(500);');
assert.ok(elements.get('milestone-message').textContent.includes('Halfway'));
run('score = 2500; updateMilestones(1500);');
assert.ok(elements.get('milestone-message').textContent.includes('water champion'));
assert.equal(run('milestonesReached.size'), 3);
run('startGame()');
assert.equal(run('milestonesReached.size'), 0, 'New games reset run milestones');
assert.equal(elements.get('milestone-message').hidden, true);
elements.get('difficulty').value = 'medium';
assert.ok(run('levels[0].seconds > levels[1].seconds && levels[1].seconds > levels[2].seconds'), 'Later levels have shorter timers');
for (const [difficulty, firstLevelSeconds, lastLevelSeconds] of [
  ['easy', 120, 100],
  ['medium', 90, 70],
  ['hard', 70, 50]
]) {
  elements.get('difficulty').value = difficulty;
  run('startGame()');
  assert.equal(run('timeLeft'), firstLevelSeconds, `${difficulty} starts with its configured time`);
  run('levelIndex = 2; startLevel()');
  assert.equal(run('timeLeft'), lastLevelSeconds, `${difficulty} applies to later levels`);
}
const routeSignatures = new Set();
for (const difficulty of ['easy', 'medium', 'hard']) {
  elements.get('difficulty').value = difficulty;
  run('startGame()');
  for (let level = 0; level < 3; level++) {
    if (level > 0) run(`levelIndex = ${level}; startLevel();`);
    const route = run('JSON.stringify(currentLevel().path)');
    assert.equal(routeSignatures.has(route), false, `${difficulty} level ${level + 1} has a unique pipe route`);
    routeSignatures.add(route);
    assert.equal(run('checkConnection().success'), false, 'A new puzzle starts unsolved');
    run('board.forEach(tile => { if (tile.solution !== null) tile.rotation = 0; });');
    assert.equal(run('checkConnection().success'), true, `${difficulty} level ${level + 1} route is solvable`);
    run('testWater()');
    assert.equal(run('state'), 'delivering');
    flushTimeouts();
    assert.equal(run('state'), 'won');
  }
}
assert.equal(routeSignatures.size, 9, 'All nine difficulty and level combinations use unique routes');
elements.get('difficulty').value = 'medium';
run('startGame()');
for (let level = 0; level < 3; level++) {
  run(`levelIndex = ${level}; startLevel();`);
  assert.equal(run('checkConnection().success'), false, 'Initial board must be unsolved');
  run('board.forEach(tile => { if (tile.solution !== null) tile.rotation = 0; });');
  assert.equal(run('checkConnection().success'), true, `Level ${level + 1} is solvable`);
  run('board[currentLevel().source].rotation = 1;');
  assert.equal(run('checkConnection().success'), false, 'Disconnected source fails');
  run('board.forEach(tile => { if (tile.solution !== null) tile.rotation = 0; }); testWater();');
  assert.equal(run('state'), 'delivering');
  const prior = run('score');
  run('testWater();');
  assert.equal(run('score'), prior, 'Repeated tests cannot duplicate points');
  flushTimeouts();
  assert.equal(run('state'), 'won');
  assert.ok(run('score') > prior);
}
run('startGame(); testWater();');
assert.equal(run('attempts'), 2);
assert.equal(run('failedTests'), 1);
assert.ok(playedFrequencies.includes(220) && playedFrequencies.includes(165), 'Failed water tests play a miss sound');
run('testWater(); testWater();');
assert.equal(run('state'), 'lost');
run('startLevel(); useHint();');
assert.equal(run('hints'), 1);
run('startLevel();');
assert.equal(run('hints'), 0);
assert.equal(run('attempts'), 3);
assert.equal(run('rotations'), 0);
now += 91000; tick();
assert.equal(run('state'), 'lost', 'Elapsed real time expires the game');
run('startGame();');
assert.equal(run('score'), 0);
assert.equal(run('levelIndex'), 0);
run("state = 'paused';");
const frozen = run('remainingMilliseconds');
now += 30000; tick();
assert.equal(run('remainingMilliseconds'), frozen, 'Pause freezes the timer');

// Restart must preserve every pipe type and orientation, not only the route.
run('startGame();');
const original = run('JSON.stringify(board)');
elements.get('grid').children[0].click();
assert.equal(run('rotations'), 1);
assert.equal(elements.get('potential').textContent, '990');
run('useHint(); testWater();');
elements.get('restart').click();
assert.equal(run('JSON.stringify(board)'), original);
assert.equal(run('rotations'), 0);
assert.equal(run('hints'), 0);
assert.equal(run('failedTests'), 0);
assert.equal(run('attempts'), 3);
assert.equal(run('timeLeft'), 90);

// A solved board still requires an explicit test.
run('board.forEach(tile => { if (tile.solution !== null) tile.rotation = 0; });');
assert.equal(run('state'), 'playing');
run('testWater();');
assert.equal(elements.get('test').disabled, true);
assert.ok(elements.get('grid').children.every(button => button.disabled));
flushTimeouts();
assert.equal(elements.get('score').textContent, run('score.toLocaleString()'));
const awarded = run('score');
run('finish(true); testWater();');
assert.equal(run('score'), awarded, 'Finished rounds cannot award twice');

// Even without a timer callback, expired games cannot win, rotate, hint, or pause.
for (const action of ['testWater()', 'useHint()', "$('grid').children[0].click()", "$('pause').click()"] ) {
  run('startGame(); board.forEach(tile => { if (tile.solution !== null) tile.rotation = 0; });');
  now += 90001;
  run(action);
  assert.equal(run('state'), 'lost', action + ' must respect the deadline');
  assert.equal(run('score'), 0);
}

// Exercise the actual pause and resume event handlers.
run('startGame();');
now += 1200;
elements.get('pause').click();
assert.equal(run('state'), 'paused');
assert.equal(elements.get('pause-dialog').open, true);
assert.ok(elements.get('grid').children.every(button => button.disabled));
const pausedBoard = run('JSON.stringify(board)');
const pausedTime = run('remainingMilliseconds');
now += 30000;
run('testWater(); useHint();');
elements.get('grid').children[0].click();
assert.equal(run('JSON.stringify(board)'), pausedBoard);
assert.equal(run('remainingMilliseconds'), pausedTime);
elements.get('resume').click();
assert.equal(run('state'), 'playing');
assert.equal(elements.get('test').disabled, false);
now += 500; tick();
assert.equal(run('remainingMilliseconds'), pausedTime - 500);

// Missing reciprocal openings and a closed community outlet must fail.
run('startGame(); board.forEach(tile => { if (tile.solution !== null) tile.rotation = 0; });');
run('board[3].rotation = 1;');
assert.equal(run('checkConnection().success'), false);
run('board[3].rotation = 0; board[8].rotation = 1;');
assert.equal(run('checkConnection().success'), false);

// Rotation efficiency and penalties are reflected in the visible potential award.
run('rotations = 4; hints = 1; failedTests = 1; updateStats();');
assert.equal(run('potentialPoints()'), 785);
assert.equal(elements.get('potential').textContent, '785');
run('rotations = 1000;');
assert.equal(run('potentialPoints()'), 100);
// Play an entire run through actual button handlers, using clockwise clicks.
// The known designed solution supplies expected orientations, not a bypass of rotation.
elements.get('start').click();
let expectedTotal = 0;
for (let level = 0; level < 3; level++) {
  assert.equal(run('levelIndex'), level);
  // Hidden result controls must not reset or advance an active round.
  elements.get('retry').click();
  elements.get('next').click();
  assert.equal(run('levelIndex'), level);
  const routeIndices = run('currentLevel().path.map(([row, col]) => row * currentLevel().size + col)');
  for (const index of routeIndices) {
    while (!run(`board[${index}].base.every(direction => openings(board[${index}]).includes(direction))`)) {
      elements.get('grid').children[index].click();
    }
  }
  assert.equal(run('state'), 'playing', 'Solving without testing cannot win');
  const levelAward = run('potentialPoints()');
  elements.get('test').click();
  assert.equal(run('state'), 'delivering');
  assert.equal(run('leakHit'), false, 'The designed solution avoids the level 3 leak');
  const rotationsAtWin = run('rotations');
  run('rotatePipe(0); restartLevel(); retryRound(); nextLevel();');
  assert.equal(run('rotations'), rotationsAtWin);
  assert.equal(run('state'), 'delivering');
  flushTimeouts();
  assert.equal(run('state'), 'won');
  assert.ok(playedFrequencies.includes(523) && playedFrequencies.includes(659) && playedFrequencies.includes(784), 'Wins play a celebratory sound');
  expectedTotal += levelAward;
  assert.equal(run('score'), expectedTotal);
  assert.equal(elements.get('result-title').textContent, 'Water delivered!');
  assert.ok(elements.get('result-breakdown').textContent.includes('rotations'));
  assert.ok(elements.get('confetti').children.length > 0, 'Wins trigger confetti');
  if (level < 2) elements.get('next').click();
}
assert.equal(elements.get('next').hidden, true);
elements.get('next').click();
assert.equal(run('levelIndex'), 2, 'Cannot advance past the final level');
elements.get('retry').click();
assert.equal(run('score'), 0);
assert.equal(run('levelIndex'), 0);
run('levelIndex = 2; startLevel();');
assert.equal(run('levelIndex'), 2);
assert.equal(run('leakHit'), false);
assert.equal(run('potentialPoints()'), 1500);
// Rotate a valid alternate route through the leak, then verify its penalty.
const leakRoute = [[0,0],[0,1],[1,1],[1,2],[2,2],[2,3],[3,3],[3,4],[4,4]];
const routeDirections = [[-1,0],[0,1],[1,0],[0,-1]];
leakRoute.forEach((cell, index) => {
  const previous = index === 0 ? [-1, 0] : leakRoute[index - 1];
  const next = index === leakRoute.length - 1 ? [5, 4] : leakRoute[index + 1];
  const openingFor = (from, to) => routeDirections.findIndex(([row, col]) => from[0] + row === to[0] && from[1] + col === to[1]);
  const desired = [openingFor(cell, previous), openingFor(cell, next)].sort((a, b) => a - b);
  const pipeIndex = cell[0] * 5 + cell[1];
  let turns = 0;
  while (!run(`board[${pipeIndex}].base.map(direction => (direction + board[${pipeIndex}].rotation) % 4).sort((a,b) => a-b).join(',') === '${desired.join(',')}'`)) {
    elements.get('grid').children[pipeIndex].click();
    turns++;
    assert.ok(turns <= 4, `Pipe ${pipeIndex} can match the alternate route`);
  }
});
assert.equal(run('checkConnection().success'), true, 'An alternate route can deliver water through the leak');
elements.get('test').click();
assert.equal(run('state'), 'delivering');
assert.equal(run('leakHit'), true);
assert.equal(run('potentialPoints()'), 1500 - run('rotations') * 10 - 150);
flushTimeouts();
assert.equal(run('state'), 'won');
assert.ok(elements.get('result-breakdown').textContent.includes('leak 150'));
run('startLevel();');
assert.equal(run('leakHit'), false, 'Restart clears the leak penalty');
assert.equal(run('timeLeft'), 70);
// The intended solution reaches the destination without touching the leak.
run('board.forEach(tile => { if (tile.solution !== null) tile.rotation = 0; });');
assert.equal(run('checkConnection().success'), true);
assert.equal(run('checkConnection().visited.has(12)'), false);
elements.get('test').click();
assert.equal(run('leakHit'), false);
assert.equal(run('state'), 'delivering');
run('goHome(); startGame();');
elements.get('restart').click();
assert.equal(run('leakHit'), false, 'Restart clears the leak penalty');

// Failure, Retry, and Home use the same original puzzle and safe round states.
const failureBoard = run('JSON.stringify(board)');
for (let attempt = 0; attempt < 3; attempt++) elements.get('test').click();
assert.equal(run('state'), 'lost');
assert.equal(elements.get('result-title').textContent, 'Out of attempts.');
assert.equal(elements.get('next').hidden, true);
elements.get('retry').click();
assert.equal(run('JSON.stringify(board)'), failureBoard);
assert.equal(run('attempts'), 3);
// Leaving during delivery cancels its delayed result, including after a new start.
run('board.forEach(tile => { if (tile.solution !== null) tile.rotation = 0; });');
elements.get('test').click();
elements.get('home-button').click();
assert.equal(elements.get('confetti').children.length, 0, 'Navigation clears celebration');
assert.equal(run('state'), 'home');
elements.get('start').click();
flushTimeouts();
assert.equal(run('state'), 'playing');
assert.equal(run('score'), 0);
now += 90001; tick();
assert.equal(elements.get('result-title').textContent, 'Time’s up.');
elements.get('retry').click();
assert.equal(run('timeLeft'), 90);
console.log('Passed: full three-level button-driven loop, failure/retry/home, connections, scoring, reset, deadline guards, pause/resume, confetti, and invalid-action guards.');
