/**
 * tests/verdict.test.js - Unit tests for end-game verdict calculation
 * Runnable with: node tests/verdict.test.js
 * Zero external dependencies.
 */

const assert = require('assert');
const { calculateVerdict } = require('../verdict.js');

let passedCount = 0;
let totalCount = 0;

function test(description, fn) {
  totalCount++;
  try {
    fn();
    passedCount++;
  } catch (err) {
    console.error(`❌ FAIL: ${description}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('--- Running Verdict (calculateVerdict) Unit Tests ---');

// 1. Combo 1: Win vs Bookie AND Win vs Computer Opponent
test('Combo 1: Win vs Bookie AND Win vs Computer Opponent', () => {
  const v = calculateVerdict(120, 110, 100);
  assert.strictEqual(v.title, '贏咗莊家！');
  assert.strictEqual(v.statusClass, 'win');
  assert.strictEqual(v.trophy, '🏆');
  assert.strictEqual(v.subtitle, '仲贏埋電腦對手 10.0 注');
  assert.strictEqual(v.bookiePnlText, '你今局贏咗莊家 20.0 注');
  assert.strictEqual(v.playerNet, 20.0);
  assert.strictEqual(v.diffVsAI, 10.0);
});

// 2. Combo 2: Win vs Bookie BUT Lost to Computer Opponent
test('Combo 2: Win vs Bookie BUT Lost to Computer Opponent', () => {
  const v = calculateVerdict(110, 125.5, 100);
  assert.strictEqual(v.title, '贏咗莊家！');
  assert.strictEqual(v.statusClass, 'win');
  assert.strictEqual(v.trophy, '🏆');
  assert.strictEqual(v.subtitle, '但電腦對手贏你 15.5 注');
  assert.strictEqual(v.bookiePnlText, '你今局贏咗莊家 10.0 注');
  assert.strictEqual(v.playerNet, 10.0);
  assert.strictEqual(v.diffVsAI, -15.5);
});

// 3. Combo 3: Lost to Bookie BUT Beat Computer Opponent (Penny Bug Case!)
test('Combo 3: Lost to Bookie BUT Beat Computer Opponent (Penny Bug)', () => {
  const v = calculateVerdict(96.4, 94.6, 100);
  assert.strictEqual(v.title, '輸給莊家');
  assert.strictEqual(v.statusClass, 'loss');
  assert.strictEqual(v.trophy, '📉');
  assert.strictEqual(v.subtitle, '但你贏咗電腦對手 1.8 注');
  assert.strictEqual(v.bookiePnlText, '莊家今局喺你身上贏咗 3.6 注');
  assert.strictEqual(v.playerNet, -3.6);
  assert.strictEqual(v.baselineNet, -5.4);
  assert.strictEqual(v.diffVsAI, 1.8);
});

// 4. Combo 4: Lost to Bookie AND Lost to Computer Opponent
test('Combo 4: Lost to Bookie AND Lost to Computer Opponent', () => {
  const v = calculateVerdict(80, 95.5, 100);
  assert.strictEqual(v.title, '輸給莊家');
  assert.strictEqual(v.statusClass, 'loss');
  assert.strictEqual(v.trophy, '📉');
  assert.strictEqual(v.subtitle, '電腦對手贏你 15.5 注');
  assert.strictEqual(v.bookiePnlText, '莊家今局喺你身上贏咗 20.0 注');
  assert.strictEqual(v.playerNet, -20.0);
  assert.strictEqual(v.diffVsAI, -15.5);
});

// 5. Draw vs Bookie variations
test('Draw vs Bookie AND Beat Computer', () => {
  const v = calculateVerdict(100, 90, 100);
  assert.strictEqual(v.title, '打和 / 保本');
  assert.strictEqual(v.statusClass, 'draw');
  assert.strictEqual(v.trophy, '🤝');
  assert.strictEqual(v.subtitle, '兼且贏咗電腦對手 10.0 注');
  assert.strictEqual(v.bookiePnlText, '今局同莊家打和（保本不失）');
});

test('Draw vs Bookie AND Lost to Computer', () => {
  const v = calculateVerdict(100, 115, 100);
  assert.strictEqual(v.title, '打和 / 保本');
  assert.strictEqual(v.statusClass, 'draw');
  assert.strictEqual(v.trophy, '🤝');
  assert.strictEqual(v.subtitle, '但電腦對手贏你 15.0 注');
  assert.strictEqual(v.bookiePnlText, '今局同莊家打和（保本不失）');
});

test('Double Draw: Draw vs Bookie AND Draw vs Computer', () => {
  const v = calculateVerdict(100, 100, 100);
  assert.strictEqual(v.title, '打和 / 保本');
  assert.strictEqual(v.statusClass, 'draw');
  assert.strictEqual(v.trophy, '🤝');
  assert.strictEqual(v.subtitle, '同電腦對手打和');
  assert.strictEqual(v.bookiePnlText, '今局同莊家打和（保本不失）');
});

// 6. Tie with Computer while Winning or Losing against Bookie
test('Win vs Bookie AND Draw vs Computer', () => {
  const v = calculateVerdict(125, 125, 100);
  assert.strictEqual(v.title, '贏咗莊家！');
  assert.strictEqual(v.statusClass, 'win');
  assert.strictEqual(v.subtitle, '同電腦對手打和');
});

test('Lost to Bookie AND Draw vs Computer', () => {
  const v = calculateVerdict(85, 85, 100);
  assert.strictEqual(v.title, '輸給莊家');
  assert.strictEqual(v.statusClass, 'loss');
  assert.strictEqual(v.subtitle, '同電腦對手打和');
  assert.strictEqual(v.bookiePnlText, '莊家今局喺你身上贏咗 15.0 注');
});

// 7. Non-default starting bankrolls (e.g. 50, 200)
test('Custom Starting Bankroll = 50', () => {
  const v = calculateVerdict(45, 40, 50);
  assert.strictEqual(v.title, '輸給莊家');
  assert.strictEqual(v.subtitle, '但你贏咗電腦對手 5.0 注');
  assert.strictEqual(v.bookiePnlText, '莊家今局喺你身上贏咗 5.0 注');
});

test('Custom Starting Bankroll = 200 with options object', () => {
  const v = calculateVerdict({ playerFinal: 230, baselineFinal: 210, startingBankroll: 200 });
  assert.strictEqual(v.title, '贏咗莊家！');
  assert.strictEqual(v.subtitle, '仲贏埋電腦對手 20.0 注');
  assert.strictEqual(v.bookiePnlText, '你今局贏咗莊家 30.0 注');
});

// 8. Floating-point tolerance test (avoid precision jitter around 0.1)
test('Floating-point rounding avoids micro-epsilon mismatch', () => {
  const v1 = calculateVerdict(99.9999999, 100, 100);
  assert.strictEqual(v1.title, '打和 / 保本');
  assert.strictEqual(v1.playerNet, 0.0);

  const v2 = calculateVerdict(100.04, 100, 100);
  assert.strictEqual(v2.title, '打和 / 保本');
  assert.strictEqual(v2.playerNet, 0.0);

  const v3 = calculateVerdict(100.06, 100, 100);
  assert.strictEqual(v3.title, '贏咗莊家！');
  assert.strictEqual(v3.playerNet, 0.1);
});

// 9. Argument validation
test('Throws TypeError on NaN, Infinity, or missing arguments', () => {
  assert.throws(() => calculateVerdict(NaN, 100, 100), TypeError);
  assert.throws(() => calculateVerdict(100, Infinity, 100), TypeError);
  assert.throws(() => calculateVerdict('100', 100, 100), TypeError);
  assert.throws(() => calculateVerdict(), TypeError);
});

console.log(`\nResults: ${passedCount} / ${totalCount} tests passed.`);
if (passedCount === totalCount) {
  console.log('✅ ALL VERDICT UNIT TESTS PASSED!');
} else {
  console.error(`❌ ${totalCount - passedCount} tests failed.`);
  process.exit(1);
}
