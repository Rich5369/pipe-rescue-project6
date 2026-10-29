// Optional QA tool, not a game dependency. Set PLAYWRIGHT_MODULE to an installed
// Playwright module path, or install Playwright separately and make it resolvable.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const artifactDirectory = process.env.QA_ARTIFACTS || '/tmp/pipe-rescue-qa-results';
fs.mkdirSync(artifactDirectory, { recursive: true });
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [];
  const requests = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', request => errors.push(request.url() + ': ' + request.failure().errorText));
    page.on('request', request => requests.push(request.url()));
    const value = expression => page.evaluate(expression);
    const click = selector => page.locator(selector).click();
    async function layout(name, width) {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 1000 });
      await page.waitForTimeout(230); // Allow the short screen-entry animation to finish.
      assert.equal(await value('document.documentElement.scrollWidth > innerWidth'), false, `${name}: horizontal overflow at ${width}`);
      const clipped = await page.locator('button:visible').evaluateAll(buttons => buttons.filter(button => {
        const box = button.getBoundingClientRect();
        return box.x < 0 || box.right > innerWidth + 1 || box.width < 1 || box.height < 1;
      }).map(button => button.id || button.textContent));
      assert.deepEqual(clipped, [], `${name}: clipped controls`);
      await page.screenshot({ path: path.join(artifactDirectory, `${name}-${width}.png`), fullPage: true });
    }
    async function bothLayouts(name) { await layout(name, 375); await layout(name, 1440); }
    await page.goto(url);
    assert.equal(await page.locator('.home-logo img').evaluate(img => img.complete && img.naturalWidth > 0), true);
    await bothLayouts('home');
    await click('[data-screen="instructions"]');
    await bothLayouts('instructions');
    await click('#play-instructions');
    assert.equal(await value('state'), 'playing');
    const before = await value('timeLeft');
    await page.waitForTimeout(1250);
    assert.ok(await value('timeLeft') < before, 'Real countdown decreases');
    await click('#pause');
    const paused = await value('remainingMilliseconds');
    const pausedBoard = await value('JSON.stringify(board)');
    await page.waitForTimeout(1250);
    assert.equal(await value('remainingMilliseconds'), paused);
    await value('rotatePipe(0); testWater(); useHint(); restartLevel();');
    assert.equal(await value('JSON.stringify(board)'), pausedBoard);
    assert.equal(await page.locator('#grid button:enabled').count(), 0);
    await page.keyboard.press('Escape');
    assert.equal(await value('state'), 'playing');
    await page.waitForTimeout(400);
    assert.ok(await value('remainingMilliseconds') < paused);
    await click('#restart');
    const original = await value('JSON.stringify(board)');
    await click('#grid button:first-child');
    await click('#hint');
    await click('#test');
    assert.equal(await value('attempts'), 2);
    await click('#restart');
    assert.equal(await value('JSON.stringify(board)'), original);
    assert.equal(await value('rotations + hints + failedTests'), 0);
    assert.equal(await value('attempts'), 3);
    assert.equal(await value('timeLeft'), 90);
    for (let attempt = 0; attempt < 3; attempt++) {
      await click('#test');
      assert.equal(await value('attempts'), 2 - attempt);
      assert.equal(await page.locator('#potential').textContent(), String(900 - attempt * 100));
    }
    assert.equal(await value('state'), 'lost');
    assert.equal(await page.locator('#result-title').textContent(), 'Out of attempts.');
    await bothLayouts('failure');
    await page.clock.install();
    await click('#retry');
    assert.equal(await value('JSON.stringify(board)'), original);
    // Accelerate only the timeout case; the real-time countdown was tested above.
    await page.clock.fastForward(91000);
    assert.equal(await value('state'), 'lost');
    assert.equal(await page.locator('#result-title').textContent(), 'Time’s up.');
    await click('#retry');
    let total = 0;
    for (let level = 0; level < 3; level++) {
      assert.equal(await value('levelIndex'), level);
      const count = await page.locator('#grid button').count();
      assert.equal(count, (level + 3) ** 2);
      // Check every pipe through an entire clockwise revolution, including fillers.
      for (let index = 0; index < count; index++) {
        const originalOpenings = await value(`openings(board[${index}])`);
        const originalDrawing = await page.locator('#grid button').nth(index).locator('.inner').getAttribute('d');
        for (let turn = 1; turn <= 4; turn++) {
          await page.locator('#grid button').nth(index).click();
          assert.deepEqual(await value(`openings(board[${index}])`), originalOpenings.map(direction => (direction + turn) % 4));
        }
        assert.equal(await page.locator('#grid button').nth(index).locator('.inner').getAttribute('d'), originalDrawing);
      }
      assert.equal(await value('rotations'), count * 4);
      await click('#restart');
      await bothLayouts(`level-${level + 1}`);
      if (level === 2) await layout('level-3-tablet', 768);
      await page.setViewportSize({width:375,height:812});
      const route = await value('levels[levelIndex].path.map(([r,c]) => r * levels[levelIndex].size + c)');
      for (const index of route) {
        while (!await value(`board[${index}].base.every(direction => openings(board[${index}]).includes(direction))`)) {
          await page.locator('#grid button').nth(index).click();
        }
      }
      assert.equal(await value('state'), 'playing', 'An untested solution must not auto-win');
      assert.equal(await value('checkConnection().success'), true);
      // A disconnected source must not pass water, even when the rest is solved.
      const source = await value('levels[levelIndex].source');
      do { await page.locator('#grid button').nth(source).click(); } while (await value(`openings(board[${source}]).includes(0)`));
      await click('#test');
      assert.equal(await value('attempts'), 2);
      assert.equal(await page.locator('.pipe.wet').count(), 0);
      while (!await value(`board[${source}].base.every(direction => openings(board[${source}]).includes(direction))`)) {
        await page.locator('#grid button').nth(source).click();
      }
      const earned = await value('potentialPoints()');
      await click('#test');
      assert.equal(await value('state'), 'delivering');
      assert.equal(await page.locator('#grid button:enabled').count(), 0);
      assert.equal(await page.locator('#progress').evaluate(el => el.value), 100);
      assert.ok(await page.locator('.pipe.wet').count() > 0);
      await page.clock.runFor(1300);
      assert.equal(await value('state'), 'won');
      total += earned;
      assert.equal(await value('score'), total);
      assert.equal(await page.locator('#score').textContent(), total.toLocaleString());
      assert.equal(await page.locator('.confetti-piece').count(), 45);
      assert.equal(await page.locator('.confetti-piece').first().evaluate(el => getComputedStyle(el).animationName), 'fall');
      await bothLayouts(`success-${level + 1}`);
      if (level < 2) await click('#next');
    }
    assert.equal(await page.locator('#next').isVisible(), false);
    await click('#result [data-screen="home"]');
    await click('[data-screen="impact"]');
    assert.equal(await page.locator('.confetti-piece').count(), 0, 'Celebration clears on navigation');
    assert.equal(await page.locator('#impact-points').textContent(), total.toLocaleString());
    await bothLayouts('impact');
    await click('#impact [data-screen="home"]');
    await click('#start');
    await page.locator('#grid button').first().focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    assert.equal(await value('rotations'), 2);
    await page.emulateMedia({reducedMotion:'reduce'});
    await value('celebrate()');
    assert.equal(await page.locator('.confetti-piece').first().evaluate(el => getComputedStyle(el).display), 'none');
    assert.deepEqual(errors, [], 'Browser console, runtime, and loading errors');
    assert.equal(requests.some(request => /^https?:/.test(request)), false, 'No backend or network requests');
    console.log(JSON.stringify({result:'PASS',browser:await browser.version(),pipeRotationsChecked:200,levelsCompleted:3,viewports:[375,768,1440],consoleErrors:errors,backendRequests:0,screenshots:artifactDirectory},null,2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
