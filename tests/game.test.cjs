// Run with node tests/game.test.cjs. No browser libraries or dependencies needed.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Element {
  constructor() { this.children = []; this.style = { setProperty() {} }; this.dataset = {}; this.classList = { add() {}, toggle() {} }; this.open = false; }
  addEventListener(type, callback) { this.listeners ??= {}; this.listeners[type] = callback; }
  click() { if (!this.disabled) this.listeners?.click?.(); }
  setAttribute() {} focus() {}
  querySelector() { return new Element(); }
  replaceChildren() { this.children = []; }
  append(child) { this.children.push(child); }
  showModal() { this.open = true; } close() { this.open = false; }
}
const elements = new Map();
const scheduled = new Map();
let timeoutId = 0;
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
  document: { getElementById: (id) => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); }, querySelectorAll: () => [], createElement: () => new Element() },
  setInterval: (callback) => { tick = callback; return 1; }, clearInterval() {},
  setTimeout: (callback) => { scheduled.set(++timeoutId, callback); return timeoutId; },
  clearTimeout: (id) => scheduled.delete(id)
});
vm.runInContext(fs.readFileSync('script.js', 'utf8'), context);
const run = (code) => vm.runInContext(code, context);
for (let level = 0; level < 3; level++) {
  run(`levelIndex = ${level}; startLevel();`);
  assert.equal(run('checkConnection().success'), false, 'Initial board must be unsolved');
  run('board.forEach(tile => { if (tile.solution !== null) tile.rotation = 0; });');
  assert.equal(run('checkConnection().success'), true, `Level ${level + 1} is solvable`);
  run('board[levels[levelIndex].source].rotation = 1;');
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
  const routeIndices = run('levels[levelIndex].path.map(([row, col]) => row * levels[levelIndex].size + col)');
  for (const index of routeIndices) {
    while (!run(`board[${index}].base.every(direction => openings(board[${index}]).includes(direction))`)) {
      elements.get('grid').children[index].click();
    }
  }
  assert.equal(run('state'), 'playing', 'Solving without testing cannot win');
  const levelAward = run('potentialPoints()');
  elements.get('test').click();
  assert.equal(run('state'), 'delivering');
  const rotationsAtWin = run('rotations');
  run('rotatePipe(0); restartLevel(); retryRound(); nextLevel();');
  assert.equal(run('rotations'), rotationsAtWin);
  assert.equal(run('state'), 'delivering');
  flushTimeouts();
  assert.equal(run('state'), 'won');
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
