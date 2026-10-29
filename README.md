# Pipe Rescue

A charity: water-inspired student puzzle prototype built with HTML, CSS, and vanilla JavaScript. Rotate pipes clockwise to connect the source above the grid to the community below it.

## Run locally

Open `index.html` in a browser, or use the VS Code Live Server extension. There is no installation or build step, and the game does not need an API or network connection.

## What is included

- Home, instructions, gameplay, success, failure, and impact screens.
- Three guaranteed solvable puzzles: 3×3, 4×4, and 5×5 grids with randomized starting rotations.
- A real elapsed-time countdown and three attempts per level.
- Connection checking that follows matching pipe openings from the source to the bottom community outlet. Disconnected extra pipes do not affect a valid route.
- Visible blue water on tested connected pipes, connection progress, and win confetti.
- Pause/resume (Escape also resumes), original-puzzle restart, and hints.
- Live potential points, aligned source/outlet markers, a low-time warning, and controls locked outside active play.
- Responsive layouts, keyboard-operable buttons, status announcements, and reduced-motion support.

## Scoring and game rules

A completed level awards `max(100, 1000 + levelIndex × 250 − rotations × 10 − hints × 75 − failedTests × 100)` points. `levelIndex` starts at zero. Time is a deadline, not a score multiplier, so fewer rotations earn more points under otherwise equal conditions.

A hint correctly orients one piece on the designed solution and reduces the potential score by 75. Failed tests cost an attempt and 100 potential points. The 100-point minimum means penalties cannot reduce a win below 100 points. Restarting restores the exact original pipe types and orientations and resets the current level's timer, attempts, rotations, and penalties, while preserving points from previously completed levels. A new game resets the run score.

Impact Points accumulate from wins during the current page session, even across new games; reloading clears them. All points, badges, and campus rewards are fictional game incentives. This independent coursework prototype is not affiliated with charity: water and does not generate donations or official rewards.

## Test it

1. Start a game. Rotate a pipe and verify that its openings and rotation count change.
2. Test the initially disconnected board: an attempt should be lost. Three failed tests show the failure screen.
3. Restart and use hints until the route is ready, then select Test Water. Connected pipes turn blue, progress reaches 100%, and the success screen awards points after a short pause.
4. Advance through all three levels. Verify that the score carries forward and the last level ends the run.
5. Pause and wait: the timer must remain still. Resume with the button or Escape.
6. Restart a level: the original arrangement is restored, and the timer, attempts, rotations, and penalties reset. Let the clock run out to test timeout.
7. Open Rewards & Impact and verify accumulated session points and the fictional-rewards notice.
8. Check the layout on a narrow mobile viewport and desktop. Use Tab and Enter/Space to rotate pipes and operate controls.

Dependency-free logic checks (Node.js required only for testing):

```sh
node --check script.js
node tests/game.test.cjs
```

The automated checks use a small DOM stub to exercise game rules. They do not replace browser checks for appearance, focus behavior, or animation.

## GitHub Pages

Commit and push these files. In your repository's **Settings → Pages**, choose **Deploy from a branch**, select your branch and **/ (root)**, and save. The relative asset paths work under a GitHub Pages project URL. No build output or hosting service is required.

## Files

- `index.html`: screens and accessible controls.
- `styles.css`: brand colors, pipe visuals, responsive layouts, and celebration animation.
- `script.js`: level definitions, state, timer, connection traversal, and score tracking.
- `img/`: original supplied brand assets.
- `tests/game.test.cjs`: dependency-free game-rule checks.

The original starter contained only a heading, brand-color comments, a console message, and image assets. The prototype retains its file structure and supplied imagery.

## How the JavaScript gameplay loop works

1. `startGame()` clears the run score and begins level one. `startLevel()` creates a solvable puzzle once, saves its starting arrangement, and resets the level's counters. Restarts copy that saved arrangement.
2. `rotatePipe(index)` turns one pipe clockwise and increases the rotation count. `openings(tile)` converts its starting directions plus its rotation into current openings: 0 = up, 1 = right, 2 = down, 3 = left.
3. `canPlay()` checks both the game status and elapsed time before allowing an action. `runTimer()` also calls it regularly to refresh the countdown. Pause stops the interval; resume starts it with a fresh time reference.
4. `checkConnection()` starts at the source and follows neighboring pipes only when their openings face each other. A `Set` remembers visited pieces so they are not processed repeatedly. Success requires reaching the actual bottom destination with a downward opening.
5. `testWater()` runs that check only when explicitly requested. Failure deducts an attempt and applies a potential-score penalty. Success locks the controls, shows the connected water route, and then opens the result screen.
6. `potentialPoints()` calculates the efficiency reward. `finish()` awards points once for a tested success, or shows failure without adding points. Results show the base award and rotation, hint, and failed-test deductions.
7. `nextLevel()`, `restartLevel()`, and `retryRound()` allow only valid transitions. Next Level requires a win; Retry requires a completed round; restarting an active level restores its saved arrangement. `goHome()` stops the timer and cancels any pending water-delivery result.

The automated gameplay-loop test clicks the real button handlers to rotate the designed routes, explicitly test them, progress through all three levels, and retry failures. It also checks timeout, pause/resume, invalid transitions, score totals, original-arrangement resets, and confetti creation. Browser layout and animation rendering still require manual verification.

## Final browser QA

See `QA_REPORT.md` for the submission review. `tests/browser.test.cjs` is an optional Playwright QA script, separate from the dependency-free game. It opens `index.html` directly, rotates every piece, completes all three levels, checks timer/pause/reset/failure behavior, captures responsive screenshots, and records browser errors. Playwright and Chromium must be installed separately to run this script; neither is needed to play or deploy the game. Set `PLAYWRIGHT_MODULE` to the installed Playwright module location if it is outside this repository. Screenshots default to `/tmp/pipe-rescue-qa-results` (override with `QA_ARTIFACTS`).
