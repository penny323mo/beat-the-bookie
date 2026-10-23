/**
 * test_e2e.js - End-to-End Automated Browser Testing via Chrome DevTools Protocol (CDP)
 * Zero external dependencies. Uses Node.js native WebSocket (--experimental-websocket).
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9222;
const HTML_PATH = 'file://' + path.resolve(__dirname, 'index.html');
const SCREENSHOTS_DIR = path.resolve(__dirname, 'screenshots');

let chromeProcess = null;
let ws = null;
let msgId = 1;
const pendingCallbacks = new Map();
const consoleErrors = [];

function cdpSend(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    pendingCallbacks.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function evaluate(expression) {
  return cdpSend('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    .then(res => {
      if (res.result && res.result.exceptionDetails) {
        throw new Error(JSON.stringify(res.result.exceptionDetails));
      }
      return res.result ? res.result.value : undefined;
    });
}

async function captureScreenshot(filename) {
  const res = await cdpSend('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(res.data, 'base64');
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, filename), buffer);
  console.log(`📸 Saved screenshot: ${filename}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForHttp(url, retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const data = await new Promise((resolve, reject) => {
        http.get(url, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
      });
      return data;
    } catch (e) {
      await sleep(200);
    }
  }
  throw new Error(`Failed to connect to ${url}`);
}

async function run() {
  fs.makedirs = fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  console.log('--- Launching Headless Chrome ---');
  chromeProcess = spawn('google-chrome', [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    `--remote-debugging-port=${PORT}`,
    '--window-size=390,844',
    HTML_PATH
  ], { stdio: 'ignore' });

  console.log('Connecting to Chrome DevTools Protocol...');
  const targets = await waitForHttp(`http://127.0.0.1:${PORT}/json`);
  const pageTarget = targets.find(t => t.type === 'page');
  if (!pageTarget) throw new Error('No page target found');

  console.log('WebSocket Debug URL:', pageTarget.webSocketDebuggerUrl);
  ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pendingCallbacks.has(data.id)) {
      const { resolve, reject } = pendingCallbacks.get(data.id);
      pendingCallbacks.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    } else if (data.method === 'Runtime.consoleAPICalled') {
      if (data.params.type === 'error') {
        console.error('Browser console.error:', data.params.args);
        consoleErrors.push(data.params.args);
      }
    } else if (data.method === 'Runtime.exceptionThrown') {
      console.error('Browser uncaught exception:', data.params.exceptionDetails);
      consoleErrors.push(data.params.exceptionDetails);
    }
  };

  await cdpSend('Runtime.enable');
  await cdpSend('Page.enable');

  console.log('\n--- Test 1: Start Screen Initial State & Live Match Count ---');
  await sleep(500);

  const initialCount = await evaluate(`document.getElementById('live-pool-num').textContent`);
  console.log('Initial live pool count text:', initialCount);
  if (initialCount !== '11,188') {
    throw new Error(`Expected initial pool count 11,188 but got ${initialCount}`);
  }

  const startBtnDisabled = await evaluate(`document.getElementById('start-game-btn').disabled`);
  console.log('Start button disabled:', startBtnDisabled);
  if (startBtnDisabled !== false) {
    throw new Error('Start button should be enabled initially');
  }

  console.log('\n--- Test 2: Switch Bet Mode to Asian Handicap (AH) ---');
  await evaluate(`
    const ahBtn = document.querySelector('#bet-mode-control .segment-btn[data-mode="ah"]');
    ahBtn.click();
  `);
  await sleep(100);

  const ahCount = await evaluate(`document.getElementById('live-pool-num').textContent`);
  console.log('AH mode live pool count:', ahCount);
  if (ahCount !== '8,908') {
    throw new Error(`Expected AH mode pool count 8,908 but got ${ahCount}`);
  }

  console.log('\n--- Test 3: Advanced Filter Team Selection ---');
  // Open details
  await evaluate(`document.getElementById('advanced-filter-details').open = true;`);
  // Select team "阿仙奴" (Arsenal)
  await evaluate(`
    const sel = document.getElementById('team-select');
    sel.value = '阿仙奴';
    sel.dispatchEvent(new Event('change'));
  `);
  await sleep(500); // Allow lazy loading of epl

  const arsenalCount = await evaluate(`document.getElementById('live-pool-num').textContent`);
  console.log('Arsenal matches in AH pool:', arsenalCount);
  const arsenalNum = parseInt(arsenalCount.replace(/,/g, ''), 10);
  if (isNaN(arsenalNum) || arsenalNum <= 0) {
    throw new Error(`Expected positive match count for Arsenal, got ${arsenalCount}`);
  }

  // Reset advanced filter
  await evaluate(`document.getElementById('btn-clear-advanced').click();`);
  await sleep(300);

  // Switch back to 1X2 mode
  await evaluate(`document.querySelector('#bet-mode-control .segment-btn[data-mode="1x2"]').click();`);
  await sleep(100);

  console.log('\n--- Test 4: Play 5-Round 1X2 Game with Exact Score Guess ---');
  // Set rounds to 5
  await evaluate(`document.querySelector('#rounds-preset-container .chip-btn[data-rounds="5"]').click();`);
  await sleep(100);

  // Click start game
  await evaluate(`document.getElementById('start-game-btn').click();`);
  await sleep(600);

  const gameScreenActive = await evaluate(`document.getElementById('game-screen').classList.contains('active')`);
  console.log('Game screen active:', gameScreenActive);
  if (!gameScreenActive) throw new Error('Game screen did not become active');

  // Capture screenshot of Round 1
  await captureScreenshot('test_game_1x2_round1.png');

  // Verify round info
  const round1Text = await evaluate(`document.getElementById('hud-round-text').textContent`);
  console.log('Round 1 HUD:', round1Text);

  // Test Reroll Feature (換一場)
  console.log('\n--- Testing Reroll (換一場) ---');
  const initialRerollPill = await evaluate(`document.getElementById('reroll-count-pill').textContent`);
  console.log('Initial reroll count pill:', initialRerollPill);
  if (initialRerollPill !== '已換 0 次') throw new Error('Expected reroll pill "已換 0 次"');

  const beforeTeamH = await evaluate(`document.getElementById('home-team-zh').textContent`);
  const beforeTeamA = await evaluate(`document.getElementById('away-team-zh').textContent`);
  console.log(`Before reroll match: ${beforeTeamH} vs ${beforeTeamA}`);

  // Click reroll button
  await evaluate(`document.getElementById('reroll-btn').click();`);
  await sleep(200);

  const afterRerollPill = await evaluate(`document.getElementById('reroll-count-pill').textContent`);
  const afterTeamH = await evaluate(`document.getElementById('home-team-zh').textContent`);
  const afterTeamA = await evaluate(`document.getElementById('away-team-zh').textContent`);
  console.log(`After reroll 1 match: ${afterTeamH} vs ${afterTeamA}, pill: ${afterRerollPill}`);
  if (afterRerollPill !== '已換 1 次') throw new Error('Expected reroll pill "已換 1 次"');

  // Test keyboard shortcut 'R' for reroll
  await evaluate(`
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
  `);
  await sleep(200);

  const keyRerollPill = await evaluate(`document.getElementById('reroll-count-pill').textContent`);
  console.log(`After keyboard R reroll pill: ${keyRerollPill}`);
  if (keyRerollPill !== '已換 2 次') throw new Error('Expected reroll pill "已換 2 次"');

  // Verify round slot did NOT advance (still round 1)
  const stillRound1 = await evaluate(`document.getElementById('hud-round-text').textContent`);
  if (!stillRound1.includes('1 / 5')) throw new Error('Reroll should not advance match round slot');

  // Pick "主勝" (Home), guess exact score 2-1
  await evaluate(`
    document.getElementById('btn-pick-h').click();
    document.getElementById('exact-score-toggle').click();
    // Set 2 - 1
    const plusH = document.getElementById('stepper-home-plus');
    const plusA = document.getElementById('stepper-away-plus');
    plusH.click(); plusH.click(); // 2
    plusA.click(); // 1
  `);
  await sleep(100);

  // Reveal round 1
  await evaluate(`document.getElementById('reveal-btn').click();`);
  await sleep(300);

  const round1ResultVisible = await evaluate(`document.getElementById('round-result-card').style.display !== 'none'`);
  console.log('Round 1 result card visible:', round1ResultVisible);
  if (!round1ResultVisible) throw new Error('Result card not visible after reveal');

  // Verify reroll button is disabled after reveal
  const rerollDisabledAfterReveal = await evaluate(`document.getElementById('reroll-btn').disabled`);
  console.log('Reroll button disabled after reveal:', rerollDisabledAfterReveal);
  if (!rerollDisabledAfterReveal) throw new Error('Reroll button should be disabled after reveal');

  await captureScreenshot('test_game_1x2_revealed.png');

  // Play remaining 4 rounds
  for (let r = 2; r <= 5; r++) {
    await evaluate(`document.getElementById('next-round-btn').click();`);
    await sleep(200);

    // Pick a choice (e.g. Draw or Away)
    const pick = r % 2 === 0 ? 'btn-pick-d' : 'btn-pick-a';
    await evaluate(`document.getElementById('${pick}').click();`);
    await sleep(100);

    // Reveal
    await evaluate(`document.getElementById('reveal-btn').click();`);
    await sleep(200);
  }

  // Click to see final report
  await evaluate(`document.getElementById('next-round-btn').click();`);
  await sleep(500);

  const endScreenActive = await evaluate(`document.getElementById('end-screen').classList.contains('active')`);
  console.log('End screen active:', endScreenActive);
  if (!endScreenActive) throw new Error('End screen did not become active');

  const verdict = await evaluate(`document.getElementById('verdict-text').textContent`);
  const finalBankroll = await evaluate(`document.getElementById('stat-final-bankroll').textContent`);
  const recapCount = await evaluate(`document.querySelectorAll('#recap-list-container .recap-item').length`);
  const endRerolls = await evaluate(`document.getElementById('stat-reroll-count').textContent`);
  console.log(`End Screen Verdict: "${verdict}", Final Bankroll: "${finalBankroll}", Recap Items: ${recapCount}, End Rerolls: "${endRerolls}"`);

  if (recapCount !== 5) {
    throw new Error(`Expected 5 recap items, got ${recapCount}`);
  }
  if (!endRerolls.includes('2')) {
    throw new Error(`Expected end rerolls to be 2, got "${endRerolls}"`);
  }

  await captureScreenshot('test_end_screen.png');

  console.log('\n--- Test 5: Play 5-Round Asian Handicap (AH) Game ---');
  // Return to home
  await evaluate(`document.getElementById('home-btn').click();`);
  await sleep(300);

  // Select AH mode & 5 rounds
  await evaluate(`
    document.querySelector('#bet-mode-control .segment-btn[data-mode="ah"]').click();
    document.querySelector('#rounds-preset-container .chip-btn[data-rounds="5"]').click();
  `);
  await sleep(100);

  // Click start game
  await evaluate(`document.getElementById('start-game-btn').click();`);
  await sleep(600);

  const ahGameActive = await evaluate(`document.getElementById('game-screen').classList.contains('active')`);
  console.log('AH Game screen active:', ahGameActive);
  if (!ahGameActive) throw new Error('AH Game screen did not become active');

  // Verify AH board visible and 1X2 board hidden
  const ahBoardDisplay = await evaluate(`document.getElementById('odds-board-ah').style.display`);
  const x2BoardDisplay = await evaluate(`document.getElementById('odds-board-1x2').style.display`);
  console.log(`AH Board display: ${ahBoardDisplay}, 1X2 Board display: ${x2BoardDisplay}`);
  if (ahBoardDisplay === 'none' || x2BoardDisplay !== 'none') {
    throw new Error('AH Board should be displayed and 1X2 board hidden in AH mode');
  }

  const ahLineH = await evaluate(`document.getElementById('ah-line-h').textContent`);
  const ahLineA = await evaluate(`document.getElementById('ah-line-a').textContent`);
  console.log(`AH Lines: Home: "${ahLineH}", Away: "${ahLineA}"`);

  await captureScreenshot('test_game_ah_round1.png');

  // Play AH Round 1: pick Home AH
  await evaluate(`document.getElementById('btn-pick-ah-h').click();`);
  await sleep(100);
  await evaluate(`document.getElementById('reveal-btn').click();`);
  await sleep(300);

  const ahStatusText = await evaluate(`document.getElementById('status-main-text').textContent`);
  console.log('AH Round 1 Result Main Text:', ahStatusText);

  await captureScreenshot('test_game_ah_revealed.png');

  // Play remaining 4 rounds
  for (let r = 2; r <= 5; r++) {
    await evaluate(`document.getElementById('next-round-btn').click();`);
    await sleep(200);

    const pickBtn = r % 2 === 0 ? 'btn-pick-ah-a' : 'btn-pick-ah-h';
    await evaluate(`document.getElementById('${pickBtn}').click();`);
    await sleep(100);
    await evaluate(`document.getElementById('reveal-btn').click();`);
    await sleep(200);
  }

  // Go to end screen
  await evaluate(`document.getElementById('next-round-btn').click();`);
  await sleep(500);

  const ahEndActive = await evaluate(`document.getElementById('end-screen').classList.contains('active')`);
  console.log('AH End screen active:', ahEndActive);
  if (!ahEndActive) throw new Error('AH End screen did not become active');

  const ahVerdict = await evaluate(`document.getElementById('verdict-text').textContent`);
  console.log('AH End Screen Verdict:', ahVerdict);

  console.log('\n--- Checking for Console Errors ---');
  if (consoleErrors.length > 0) {
    console.error('❌ Console errors were recorded:', consoleErrors);
    throw new Error(`Encountered ${consoleErrors.length} console errors!`);
  } else {
    console.log('✅ ZERO CONSOLE ERRORS!');
  }

  console.log('\n🎉 ALL END-TO-END AUTOMATED BROWSER TESTS PASSED PERFECTLY!');
}

run().catch(err => {
  console.error('❌ E2E TEST FAILED:', err);
  process.exitCode = 1;
}).finally(() => {
  if (ws) ws.close();
  if (chromeProcess) chromeProcess.kill('SIGKILL');
});
