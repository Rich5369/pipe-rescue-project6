# Pipe Rescue — Project 5 QA review

Reviewed October 22, 2026. Estimated technical score: **70/70**, based on the supplied rubric. This is an estimate, not an instructor's grade. The separate 30 reflection points are outside this review.

## Verification performed

- Real headless Chromium 156.0.8078.4, using Playwright installed outside the project.
- Loaded the actual `index.html` through `file://`, with the real HTML, CSS, JavaScript, and image assets.
- Automated DOM-based clicks, keyboard activation, screen visibility checks, runtime/console/resource-error monitoring, screenshots, and layout measurements.
- Checked every main screen at 375px and 1440px widths; also checked the 5×5 game at 768px. Inspected screenshots of the home, gameplay, success, failure, and impact screens. Normal vertical scrolling is necessary on mobile.
- Separate dependency-free Node game-rule regression tests and JavaScript syntax/whitespace checks.
- Final browser suite passed after the confetti-navigation fix.

## Requested checks

| Check | Result | Evidence and scope |
|---|---|---|
| 1. Start game | Passed | Clicked both the instructions-screen start control and home Start Game. Gameplay appeared with initialized state. |
| 2. Pipe rotation | Passed | Clicked all 50 pieces across the three levels through four clockwise turns each: 200 verified rotations. Checked directions and restored SVG drawing. |
| 3. Interaction feedback | Passed for exercised controls | Rotation counts and potential points updated; failed tests changed attempts and potential award; connected pieces turned blue; results displayed points and deductions. |
| 4. Test Water accuracy | Passed for tested cases | Solved all three designed routes through rotation clicks; explicit testing was required. Breaking each source prevented water entry and consumed an attempt. Node checks also rejected a mismatched adjacent piece and closed destination outlet. |
| 5. Attempts | Passed | Three bad tests reduced attempts from 3 to 0 and opened failure. Retry restored three attempts. |
| 6. Score | Passed | Checked failed-test penalties, formula deductions, cumulative awards across three wins, HUD/result totals, and new-game reset. Minimum award remains 100 points. |
| 7. Countdown | Passed | Observed a decrease over 1.25 seconds of real time. Separately advanced a controlled browser clock to verify timeout failure; deadline guards are also covered by Node regression tests. |
| 8. Pause | Passed | Waited 1.25 real seconds while paused; remaining milliseconds were unchanged. Pipes were disabled and guarded actions could not alter the board. Escape resumed, and time decreased again. |
| 9. Restart | Passed | Compared the complete board before moves and after restart/retry. Types and orientations matched exactly; rotations, hints, penalties, attempts, and clock reset. |
| 10. Win and loss | Passed | Reached actual success screens, three-attempt failure, and time-expired failure. Retry and Home controls were exercised. |
| 11. Celebration | Passed | Each win created 45 confetti pieces with an active `fall` animation; confetti was visible in screenshots. Reduced-motion mode hid the particles. Navigation now clears them immediately. |
| 12. All levels | Passed | Completed levels 1, 2, and 3 with clicks and Test Water. Next Level advanced correctly and was hidden after the final level. |
| 13. Responsive layout | Passed at tested widths | At 375px and 1440px, checked home, instructions, all puzzle sizes, success, failure, and impact screens for horizontal overflow and clipped controls. Additional 768px check on level 3. Screenshot review confirmed readable, usable layouts. |
| 14. Console errors | Passed in tested Chromium flows | No JavaScript runtime errors, console errors, or failed resource requests were recorded. This does not claim all browsers or untested flows are error-free. |
| 15. No backend | Passed locally | Completed the game directly from local files. Recorded zero HTTP/HTTPS requests. No server, account, API, or database was needed. |

## Bug fixed during QA

Confetti could remain briefly over another screen if the player left a win screen before the animation ended. `showScreen()` now clears the particles and cancels their cleanup timeout when navigating away from results. Both browser and Node regression checks passed afterward.

## Estimated rubric score

| Category | Estimate | Justification |
|---|---:|---|
| Core interactivity | 25/25 | Real rotation, connection validation, explicit testing, visible feedback, tracked score, and a working multi-level loop. |
| Responsive layout | 15/15 | Tested mobile and desktop screens remain usable without horizontal overflow or clipped buttons. Tablet gameplay also checked. |
| Branding and visual design | 10/10 | Supplied charity: water logo, yellow actions, blue water cues, consistent outlined panels, mission-related text, and clear fictional-reward notices. A subsequent review checked the supplied February 2020 Brand Usage Guide; see BRAND_REVIEW.md. |
| Gameplay challenge | 10/10 | Countdown and limited attempts create a challenge. Bad tests reduce potential win points by 100; hints and rotations also reduce the award. |
| Functional reset | 5/5 | Restart restores the original arrangement and resets level state. |
| Victory celebration | 5/5 | Real animated win confetti plus a clear result screen; reduced-motion users retain the static success indicator. |
| **Technical total** | **70/70** | **Estimated from the supplied rubric and performed checks.** |

## Remaining limits and pre-submission checks

- Browser testing covered Chromium, not Safari or Firefox, and used simulated viewport sizes rather than a physical phone.
- The actual published GitHub Pages URL was not tested. Verify that URL after deployment, including images and relative script/style loading.
- The subsequently supplied local February 2020 brand PDF has now been reviewed. See BRAND_REVIEW.md for requirements and changes.
- Points and badges intentionally reset on page reload and are fictional; no real reward redemption or donations occur.
- Penalties reduce potential completion points, with a 100-point floor; they do not subtract from points already earned on earlier levels. The UI and instructions state the scoring rules.
- Before submission, play a round on your phone, check keyboard operation on your laptop, confirm confetti (or reduced-motion success feedback), test Restart/Pause, and check the browser console on the deployed site.

## Reproducing tests

Game logic (no dependencies):

```sh
node --check script.js
node tests/game.test.cjs
```

Optional real-browser QA: run `node tests/browser.test.cjs` with a separately installed Playwright package and Chromium. If Playwright is installed outside the repository, set `PLAYWRIGHT_MODULE` to its module directory. If browsers were installed to a custom directory, set `PLAYWRIGHT_BROWSERS_PATH` accordingly. Screenshots default to `/tmp/pipe-rescue-qa-results`; set `QA_ARTIFACTS` to change this. These tools are for QA only, not game runtime dependencies.
