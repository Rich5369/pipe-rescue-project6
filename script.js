// Directions run clockwise: up, right, down, left.
const directions = [[-1, 0], [0, 1], [1, 0], [0, -1]];
const levels = [
  { size: 3, seconds: 90, path: [[0,0],[1,0],[1,1],[2,1],[2,2]], source: 0, goal: 2 },
  { size: 4, seconds: 100, path: [[0,1],[1,1],[1,0],[2,0],[2,1],[2,2],[1,2],[1,3],[2,3],[3,3]], source: 1, goal: 3 },
  { size: 5, seconds: 120, path: [[0,0],[0,1],[1,1],[1,2],[0,2],[0,3],[0,4],[1,4],[2,4],[2,3],[2,2],[2,1],[2,0],[3,0],[4,0],[4,1],[4,2],[3,2],[3,3],[3,4],[4,4]], source: 0, goal: 4 }
];
const $ = (id) => document.getElementById(id);
let levelIndex = 0;
let board = [];
let initialBoards = [];
let score = 0;
let impactPoints = 0;
let rotations = 0;
let hints = 0;
let failedTests = 0;
let timeLeft = 0;
let attempts = 3;
let state = 'home';
let timerId;
let lastTick;
let remainingMilliseconds;
let celebrationId;
let deliveryId;

function showScreen(id) {
  // Keep win effects on the result screen instead of covering the next puzzle.
  if (id !== 'result') {
    clearTimeout(celebrationId);
    $('confetti').replaceChildren();
  }
  document.querySelectorAll('.screen').forEach((screen) => { screen.hidden = screen.id !== id; });
  const heading = $(id).querySelector('h1');
  heading.tabIndex = -1;
  heading.focus();
}
function stopTimer() { clearInterval(timerId); }
function goHome() {
  stopTimer();
  clearTimeout(deliveryId);
  if ($('pause-dialog').open) $('pause-dialog').close();
  state = 'home';
  updateControls();
  showScreen('home');
}
function startGame() {
  score = 0;
  initialBoards = [];
  levelIndex = 0;
  startLevel();
}
// Convert a neighboring cell into a compass direction.
function directionTo(from, to) {
  return directions.findIndex(([dr, dc]) => from[0] + dr === to[0] && from[1] + dc === to[1]);
}
// Adding 1 turns clockwise; % 4 wraps left (3) back to up (0).
function openings(tile) { return tile.base.map((direction) => (direction + tile.rotation) % 4); }
function startLevel() {
  stopTimer();
  clearTimeout(deliveryId);
  const level = levels[levelIndex];
  rotations = 0; hints = 0; failedTests = 0; attempts = 3;
  timeLeft = level.seconds;
  remainingMilliseconds = level.seconds * 1000;
  if (!initialBoards[levelIndex]) {
    board = Array.from({ length: level.size * level.size }, () => ({ base: Math.random() < .5 ? [0,2] : [0,1], rotation: Math.floor(Math.random() * 4), solution: null }));
    // Build a guaranteed solvable route, then turn each route piece away from its solution.
    level.path.forEach((cell, index) => {
      const previous = index === 0 ? [-1, level.source] : level.path[index - 1];
      const next = index === level.path.length - 1 ? [level.size, level.goal] : level.path[index + 1];
      const base = [directionTo(cell, previous), directionTo(cell, next)];
      board[cell[0] * level.size + cell[1]] = { base, rotation: Math.random() < .5 ? 1 : 3, solution: 0 };
    });
    initialBoards[levelIndex] = board.map(tile => ({ ...tile, base: [...tile.base] }));
  }
  // Always restore a fresh copy, so player moves cannot change the saved puzzle.
  board = initialBoards[levelIndex].map(tile => ({ ...tile, base: [...tile.base] }));
  state = 'playing';
  $('grid').style.setProperty('--size', level.size);
  $('source-marker').style.gridColumn = level.source + 1;
  $('goal-marker').style.gridColumn = level.goal + 1;
  document.querySelectorAll('.port-row').forEach(row => row.style.setProperty('--size', level.size));
  $('source-column').textContent = `· column ${level.source + 1}`;
  $('goal-column').textContent = `· column ${level.goal + 1}`;
  $('feedback').textContent = 'Rotate the pipes to connect the source to the community.';
  renderBoard(); updateStats(); updateControls(); setProgress(0);
  showScreen('game');
  runTimer();
}
// Every action checks elapsed time as well as the scheduled timer tick.
function canPlay() {
  if (state !== 'playing') return false;
  const now = Date.now();
  remainingMilliseconds = Math.max(0, remainingMilliseconds - (now - lastTick));
  lastTick = now;
  timeLeft = Math.ceil(remainingMilliseconds / 1000);
  updateStats();
  if (timeLeft === 0) {
    finish(false, 'Time’s up.');
    return false;
  }
  return true;
}
function runTimer() {
  stopTimer();
  lastTick = Date.now();
  timerId = setInterval(canPlay, 200);
}
function potentialPoints() {
  return Math.max(100, 1000 + levelIndex * 250 - rotations * 10 - hints * 75 - failedTests * 100);
}
function updateControls() {
  const disabled = state !== 'playing';
  ['test', 'restart', 'hint', 'pause'].forEach(id => { $(id).disabled = disabled; });
  [...$('grid').children].forEach(button => { button.disabled = disabled; });
}
function updateStats() {
  $('level').textContent = `${levelIndex + 1} / ${levels.length}`;
  $('score').textContent = score.toLocaleString();
  $('timer').textContent = `${String(Math.floor(timeLeft / 60)).padStart(2,'0')}:${String(timeLeft % 60).padStart(2,'0')}`;
  $('lives').textContent = `${attempts} / 3`;
  $('potential').textContent = potentialPoints().toLocaleString();
  $('timer').classList.toggle('urgent', timeLeft <= 15);
  $('moves').textContent = `Rotations: ${rotations} · Hints: ${hints}`;
}
function renderBoard() {
  $('grid').replaceChildren();
  board.forEach((tile, index) => {
    const button = document.createElement('button');
    button.className = 'pipe';
    const ends = openings(tile);
    button.setAttribute('aria-label', `Row ${Math.floor(index / levels[levelIndex].size) + 1}, column ${index % levels[levelIndex].size + 1}: openings ${ends.map((d) => ['up','right','down','left'][d]).join(' and ')}. Rotate clockwise.`);
    const points = ['50 0','100 50','50 100','0 50'];
    const path = ends.map((d) => `M 50 50 L ${points[d]}`).join(' ');
    button.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><path class="outer" d="${path}"/><path class="inner" d="${path}"/></svg>`;
    button.disabled = state !== 'playing';
    button.addEventListener('click', () => rotatePipe(index));
    $('grid').append(button);
  });
}
// The board changes only while a round is active and before its deadline.
function rotatePipe(index) {
  if (!canPlay() || !board[index]) return;
  board[index].rotation = (board[index].rotation + 1) % 4;
  rotations++;
  renderBoard();
  $('grid').children[index].focus();
  updateStats(); setProgress(0);
  $('feedback').textContent = 'Pipe rotated. Test Water when your route is ready.';
}
function restartLevel() {
  if (canPlay()) startLevel();
}
function nextLevel() {
  if (state !== 'won' || levelIndex >= levels.length - 1) return;
  levelIndex++;
  startLevel();
}
function retryRound() {
  if (state === 'lost') startLevel();
  else if (state === 'won') startGame();
}
// Follow only matching openings. An open end at the bottom goal delivers water.
function checkConnection() {
  const level = levels[levelIndex];
  const visited = new Set();
  const queue = [];
  if (openings(board[level.source]).includes(0)) queue.push(level.source);
  let success = false;
  while (queue.length) {
    const index = queue.shift();
    if (visited.has(index)) continue;
    visited.add(index);
    const row = Math.floor(index / level.size);
    const col = index % level.size;
    for (const direction of openings(board[index])) {
      if (row === level.size - 1 && col === level.goal && direction === 2) success = true;
      const [dr, dc] = directions[direction];
      const nextRow = row + dr, nextCol = col + dc;
      if (nextRow < 0 || nextRow >= level.size || nextCol < 0 || nextCol >= level.size) continue;
      const neighbor = nextRow * level.size + nextCol;
      if (openings(board[neighbor]).includes((direction + 2) % 4) && !visited.has(neighbor)) queue.push(neighbor);
    }
  }
  return { success, visited };
}
function setProgress(value) { $('progress').value = value; $('progress-text').textContent = `${value}%`; }
function testWater() {
  if (!canPlay()) return;
  const result = checkConnection();
  renderBoard();
  result.visited.forEach((index) => $('grid').children[index].classList.add('wet'));
  const level = levels[levelIndex];
  const furthestRow = result.visited.size ? Math.max(...[...result.visited].map((i) => Math.floor(i / level.size))) + 1 : 0;
  setProgress(result.success ? 100 : Math.min(95, Math.round(furthestRow / level.size * 100)));
  if (result.success) {
    state = 'delivering'; stopTimer();
    updateControls();
    renderBoard();
    result.visited.forEach((index) => $('grid').children[index].classList.add('wet'));
    $('feedback').textContent = 'Water delivered! Your community is connected.';
    // Leave the completed blue route visible before showing the score.
    deliveryId = setTimeout(() => { if (state === 'delivering') finish(true); }, 1200);
  } else {
    attempts--; failedTests++; updateStats();
    // Highlight the last connected piece, or the source when water cannot enter.
    const lastConnected = [...result.visited].pop();
    $('grid').children[lastConnected === undefined ? level.source : lastConnected].classList.add('error');
    $('feedback').textContent = `The water hasn’t reached the community. Check the pipe openings. ${attempts} attempts left (−100 potential points).`;
    if (attempts === 0) finish(false, 'Out of attempts.');
  }
}
function useHint() {
  if (!canPlay()) return;
  const level = levels[levelIndex];
  if (checkConnection().success) { $('feedback').textContent = 'Your route is ready. Press Test Water to deliver it!'; return; }
  const cell = level.path.find(([row,col]) => {
    const tile = board[row * level.size + col];
    return !tile.base.every((direction) => openings(tile).includes(direction));
  });
  if (!cell) { $('feedback').textContent = 'Your route is ready. Try Test Water!'; return; }
  const index = cell[0] * level.size + cell[1];
  board[index].rotation = 0; hints++;
  renderBoard(); updateStats(); setProgress(0);
  $('grid').children[index].classList.add('hinted');
  $('feedback').textContent = `Hint: the highlighted pipe at row ${cell[0] + 1}, column ${cell[1] + 1} is now correctly oriented. −75 potential points.`;
}
function finish(won, reason = '') {
  // A win is allowed only after Test Water verified the route.
  if (won ? state !== 'delivering' : state !== 'playing') return;
  stopTimer(); state = won ? 'won' : 'lost';
  updateControls();
  let earned = 0;
  if (won) {
    earned = potentialPoints();
    score += earned; impactPoints += earned;
    celebrate();
  }
  updateStats();
  $('result').dataset.outcome = state;
  $('result-icon').textContent = won ? '✓' : '×';
  $('result-label').textContent = won ? 'CONNECTION COMPLETE' : 'EVERY TRY IS A NEW START';
  $('result-title').textContent = won ? 'Water delivered!' : reason;
  $('result-message').textContent = won ? `Level ${levelIndex + 1} solved in ${rotations} rotations. ${levelIndex === levels.length - 1 ? 'You connected all three communities!' : 'Ready for your next connection?'}` : 'Every attempt is practice. Restart this level with a fresh timer and three attempts.';
  $('result-breakdown').textContent = won
    ? `Base ${1000 + levelIndex * 250} − rotations ${rotations * 10} − hints ${hints * 75} − failed tests ${failedTests * 100}. Minimum award: 100 points.`
    : `${rotations} rotations · ${failedTests} unsuccessful tests. No points awarded for this level.`;
  $('result-score').textContent = won ? `+${earned} points · Total ${score}` : `Final score: ${score}`;
  $('next').hidden = !won || levelIndex === levels.length - 1;
  $('retry').textContent = won ? 'Play again' : 'Retry level';
  showScreen('result');
}
function celebrate() {
  clearTimeout(celebrationId); $('confetti').replaceChildren();
  for (let i = 0; i < 45; i++) {
    const piece = document.createElement('span'); piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = ['#ffc907','#003366','#77a8bb'][i % 3];
    piece.style.animationDelay = `${Math.random() * .5}s`;
    $('confetti').append(piece);
  }
  celebrationId = setTimeout(() => $('confetti').replaceChildren(), 3500);
}
$('start').addEventListener('click', startGame);
$('play-instructions').addEventListener('click', startGame);
$('brand').addEventListener('click', (event) => { event.preventDefault(); goHome(); });
$('home-button').addEventListener('click', goHome);
document.querySelectorAll('[data-screen]').forEach((button) => button.addEventListener('click', () => {
  stopTimer(); clearTimeout(deliveryId); state = button.dataset.screen;
  updateControls();
  $('impact-points').textContent = impactPoints.toLocaleString();
  showScreen(button.dataset.screen);
}));
$('test').addEventListener('click', testWater);
$('restart').addEventListener('click', restartLevel);
$('hint').addEventListener('click', useHint);
$('next').addEventListener('click', nextLevel);
$('retry').addEventListener('click', retryRound);
function resume() {
  if (state !== 'paused') return;
  $('pause-dialog').close(); state = 'playing'; updateControls(); runTimer();
  $('pause').focus();
}
$('pause').addEventListener('click', () => {
  if (!canPlay()) return;
  stopTimer(); state = 'paused'; updateControls(); $('pause-dialog').showModal();
});
$('resume').addEventListener('click', resume);
$('pause-dialog').addEventListener('cancel', (event) => { event.preventDefault(); resume(); });
