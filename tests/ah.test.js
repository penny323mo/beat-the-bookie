/**
 * tests/ah.test.js - Unit tests for Asian Handicap settlement
 * Runnable with: node tests/ah.test.js
 * Zero external dependencies.
 */

const assert = require('assert');
const { settleAH } = require('../ah.js');

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

const STAKE = 10;
const ODDS = 1.90; // profit on full win = 10 * 0.9 = 9.00; halfwin = 4.50; halfloss = -5.00; loss = -10.00; push = 0.00

console.log('--- Running Asian Handicap (settleAH) Unit Tests ---');

// 1. Line 0 (Level handicap / Draw No Bet)
test('Line 0: win when diff > 0', () => {
  const res = settleAH(1, 0, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line 0: push when diff === 0', () => {
  const res = settleAH(0, 0, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'push');
  assert.strictEqual(res.profit, 0);
});

test('Line 0: loss when diff < 0', () => {
  const res = settleAH(-1, 0, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 2. Line +0.25 (Quarter ball received: 0 and +0.5)
test('Line +0.25: win when diff >= 1', () => {
  const res = settleAH(1, 0.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line +0.25: halfwin when diff === 0', () => {
  const res = settleAH(0, 0.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'halfwin');
  assert.strictEqual(res.profit, 4.50);
});

test('Line +0.25: loss when diff <= -1', () => {
  const res = settleAH(-1, 0.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 3. Line -0.25 (Quarter ball given: 0 and -0.5)
test('Line -0.25: win when diff >= 1', () => {
  const res = settleAH(1, -0.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line -0.25: halfloss when diff === 0', () => {
  const res = settleAH(0, -0.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'halfloss');
  assert.strictEqual(res.profit, -5.00);
});

test('Line -0.25: loss when diff <= -1', () => {
  const res = settleAH(-1, -0.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 4. Line +0.5 (Half ball received)
test('Line +0.5: win when diff >= 0', () => {
  const res1 = settleAH(0, 0.5, ODDS, STAKE);
  assert.strictEqual(res1.outcome, 'win');
  assert.strictEqual(res1.profit, 9.00);

  const res2 = settleAH(1, 0.5, ODDS, STAKE);
  assert.strictEqual(res2.outcome, 'win');
  assert.strictEqual(res2.profit, 9.00);
});

test('Line +0.5: loss when diff <= -1', () => {
  const res = settleAH(-1, 0.5, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 5. Line -0.5 (Half ball given)
test('Line -0.5: win when diff >= 1', () => {
  const res = settleAH(1, -0.5, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line -0.5: loss when diff <= 0', () => {
  const res1 = settleAH(0, -0.5, ODDS, STAKE);
  assert.strictEqual(res1.outcome, 'loss');
  assert.strictEqual(res1.profit, -10.00);

  const res2 = settleAH(-1, -0.5, ODDS, STAKE);
  assert.strictEqual(res2.outcome, 'loss');
  assert.strictEqual(res2.profit, -10.00);
});

// 6. Line +0.75 (Three-quarter ball received: +0.5 and +1.0)
test('Line +0.75: win when diff >= 0', () => {
  const res = settleAH(0, 0.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line +0.75: halfloss when diff === -1', () => {
  const res = settleAH(-1, 0.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'halfloss');
  assert.strictEqual(res.profit, -5.00);
});

test('Line +0.75: loss when diff <= -2', () => {
  const res = settleAH(-2, 0.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 7. Line -0.75 (Three-quarter ball given: -0.5 and -1.0)
test('Line -0.75: win when diff >= 2', () => {
  const res = settleAH(2, -0.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line -0.75: halfwin when diff === 1', () => {
  const res = settleAH(1, -0.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'halfwin');
  assert.strictEqual(res.profit, 4.50);
});

test('Line -0.75: loss when diff <= 0', () => {
  const res = settleAH(0, -0.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 8. Line +1.0 (One ball received)
test('Line +1: win when diff >= 0', () => {
  const res = settleAH(0, 1.0, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line +1: push when diff === -1', () => {
  const res = settleAH(-1, 1.0, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'push');
  assert.strictEqual(res.profit, 0);
});

test('Line +1: loss when diff <= -2', () => {
  const res = settleAH(-2, 1.0, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 9. Line -1.0 (One ball given)
test('Line -1: win when diff >= 2', () => {
  const res = settleAH(2, -1.0, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line -1: push when diff === 1', () => {
  const res = settleAH(1, -1.0, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'push');
  assert.strictEqual(res.profit, 0);
});

test('Line -1: loss when diff <= 0', () => {
  const res = settleAH(0, -1.0, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 10. Line +1.25 (+1.0 and +1.5)
test('Line +1.25: win when diff >= 0', () => {
  const res = settleAH(0, 1.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line +1.25: halfwin when diff === -1', () => {
  const res = settleAH(-1, 1.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'halfwin');
  assert.strictEqual(res.profit, 4.50);
});

test('Line +1.25: loss when diff <= -2', () => {
  const res = settleAH(-2, 1.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 11. Line -1.25 (-1.0 and -1.5)
test('Line -1.25: win when diff >= 2', () => {
  const res = settleAH(2, -1.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line -1.25: halfloss when diff === 1', () => {
  const res = settleAH(1, -1.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'halfloss');
  assert.strictEqual(res.profit, -5.00);
});

test('Line -1.25: loss when diff <= 0', () => {
  const res = settleAH(0, -1.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 12. Line -1.5 (Goal and a half given)
test('Line -1.5: win when diff >= 2', () => {
  const res = settleAH(2, -1.5, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line -1.5: loss when diff <= 1', () => {
  const res = settleAH(1, -1.5, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 13. Line +2.0 (Two balls received)
test('Line +2: win when diff >= -1', () => {
  const res = settleAH(-1, 2.0, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line +2: push when diff === -2', () => {
  const res = settleAH(-2, 2.0, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'push');
  assert.strictEqual(res.profit, 0);
});

test('Line +2: loss when diff <= -3', () => {
  const res = settleAH(-3, 2.0, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 14. Line +1.5 (Goal and a half received)
test('Line +1.5: win when diff >= -1', () => {
  const res1 = settleAH(-1, 1.5, ODDS, STAKE);
  assert.strictEqual(res1.outcome, 'win');
  assert.strictEqual(res1.profit, 9.00);

  const res2 = settleAH(0, 1.5, ODDS, STAKE);
  assert.strictEqual(res2.outcome, 'win');
  assert.strictEqual(res2.profit, 9.00);
});

test('Line +1.5: loss when diff <= -2', () => {
  const res = settleAH(-2, 1.5, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 15. Line -2.0 (Two balls given)
test('Line -2: win when diff >= 3', () => {
  const res = settleAH(3, -2.0, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line -2: push when diff === 2', () => {
  const res = settleAH(2, -2.0, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'push');
  assert.strictEqual(res.profit, 0);
});

test('Line -2: loss when diff <= 1', () => {
  const res = settleAH(1, -2.0, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 16. Line +1.75 (+1.5 and +2.0 received)
test('Line +1.75: win when diff >= -1', () => {
  const res = settleAH(-1, 1.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line +1.75: halfloss when diff === -2 (+1.5 loss, +2.0 push)', () => {
  const res = settleAH(-2, 1.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'halfloss');
  assert.strictEqual(res.profit, -5.00);
});

test('Line +1.75: loss when diff <= -3', () => {
  const res = settleAH(-3, 1.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 17. Line -1.75 (-1.5 and -2.0 given)
test('Line -1.75: win when diff >= 3', () => {
  const res = settleAH(3, -1.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line -1.75: halfwin when diff === 2 (-1.5 win, -2.0 push)', () => {
  const res = settleAH(2, -1.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'halfwin');
  assert.strictEqual(res.profit, 4.50);
});

test('Line -1.75: loss when diff <= 1', () => {
  const res = settleAH(1, -1.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 18. Line +2.25 (+2.0 and +2.5 received)
test('Line +2.25: win when diff >= -1', () => {
  const res = settleAH(-1, 2.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line +2.25: halfwin when diff === -2 (+2.0 push, +2.5 win)', () => {
  const res = settleAH(-2, 2.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'halfwin');
  assert.strictEqual(res.profit, 4.50);
});

test('Line +2.25: loss when diff <= -3', () => {
  const res = settleAH(-3, 2.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 19. Line -2.25 (-2.0 and -2.5 given)
test('Line -2.25: win when diff >= 3', () => {
  const res = settleAH(3, -2.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line -2.25: halfloss when diff === 2 (-2.0 push, -2.5 loss)', () => {
  const res = settleAH(2, -2.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'halfloss');
  assert.strictEqual(res.profit, -5.00);
});

test('Line -2.25: loss when diff <= 1', () => {
  const res = settleAH(1, -2.25, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 20. Line +2.5 (Two and a half balls received)
test('Line +2.5: win when diff >= -2', () => {
  const res1 = settleAH(-2, 2.5, ODDS, STAKE);
  assert.strictEqual(res1.outcome, 'win');
  assert.strictEqual(res1.profit, 9.00);

  const res2 = settleAH(-1, 2.5, ODDS, STAKE);
  assert.strictEqual(res2.outcome, 'win');
  assert.strictEqual(res2.profit, 9.00);
});

test('Line +2.5: loss when diff <= -3', () => {
  const res = settleAH(-3, 2.5, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 21. Line -2.5 (Two and a half balls given)
test('Line -2.5: win when diff >= 3', () => {
  const res = settleAH(3, -2.5, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line -2.5: loss when diff <= 2', () => {
  const res = settleAH(2, -2.5, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 22. Line +2.75 (+2.5 and +3.0 received)
test('Line +2.75: win when diff >= -2', () => {
  const res = settleAH(-2, 2.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line +2.75: halfloss when diff === -3 (+2.5 loss, +3.0 push)', () => {
  const res = settleAH(-3, 2.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'halfloss');
  assert.strictEqual(res.profit, -5.00);
});

test('Line +2.75: loss when diff <= -4', () => {
  const res = settleAH(-4, 2.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 23. Line -2.75 (-2.5 and -3.0 given)
test('Line -2.75: win when diff >= 4', () => {
  const res = settleAH(4, -2.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'win');
  assert.strictEqual(res.profit, 9.00);
});

test('Line -2.75: halfwin when diff === 3 (-2.5 win, -3.0 push)', () => {
  const res = settleAH(3, -2.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'halfwin');
  assert.strictEqual(res.profit, 4.50);
});

test('Line -2.75: loss when diff <= 2', () => {
  const res = settleAH(2, -2.75, ODDS, STAKE);
  assert.strictEqual(res.outcome, 'loss');
  assert.strictEqual(res.profit, -10.00);
});

// 20. Non-10 Stakes (5, 25, 50, 100)
test('Non-10 stake: stake=5, odds=1.95 on line -0.75 halfwin and halfloss', () => {
  const stake5 = 5;
  const odds195 = 1.95;
  // halfwin: (5 / 2) * 0.95 = 2.375 -> rounded to 2.38
  const hw = settleAH(1, -0.75, odds195, stake5);
  assert.strictEqual(hw.outcome, 'halfwin');
  assert.strictEqual(hw.profit, 2.38);

  // halfloss: -5 / 2 = -2.50
  const hl = settleAH(0, -0.25, odds195, stake5);
  assert.strictEqual(hl.outcome, 'halfloss');
  assert.strictEqual(hl.profit, -2.50);
});

test('Non-10 stake: stake=25, odds=1.88 on line -1.0 win/push/loss', () => {
  const stake25 = 25;
  const odds188 = 1.88;
  const w = settleAH(2, -1.0, odds188, stake25);
  assert.strictEqual(w.outcome, 'win');
  assert.strictEqual(w.profit, 22.00); // 25 * 0.88 = 22.00

  const p = settleAH(1, -1.0, odds188, stake25);
  assert.strictEqual(p.outcome, 'push');
  assert.strictEqual(p.profit, 0);

  const l = settleAH(0, -1.0, odds188, stake25);
  assert.strictEqual(l.outcome, 'loss');
  assert.strictEqual(l.profit, -25.00);
});

test('Non-10 stake: stake=50, odds=2.10 on quarter lines', () => {
  const stake50 = 50;
  const odds210 = 2.10;
  // halfwin on +0.25 on draw: (50 / 2) * 1.10 = 27.50
  const hw = settleAH(0, 0.25, odds210, stake50);
  assert.strictEqual(hw.outcome, 'halfwin');
  assert.strictEqual(hw.profit, 27.50);

  // halfloss on +0.75 on -1 diff: -50 / 2 = -25.00
  const hl = settleAH(-1, 0.75, odds210, stake50);
  assert.strictEqual(hl.outcome, 'halfloss');
  assert.strictEqual(hl.profit, -25.00);
});

// 21. Even money odds (odds = 2.00)
test('Even money odds (2.00): profit equals stake on win, half-stake on halfwin/halfloss', () => {
  const stake20 = 20;
  const evenOdds = 2.00;

  // win: 20 * (2.00 - 1) = 20.00
  const w = settleAH(1, 0, evenOdds, stake20);
  assert.strictEqual(w.outcome, 'win');
  assert.strictEqual(w.profit, 20.00);

  // halfwin: (20 / 2) * 1.00 = 10.00
  const hw = settleAH(0, 0.25, evenOdds, stake20);
  assert.strictEqual(hw.outcome, 'halfwin');
  assert.strictEqual(hw.profit, 10.00);

  // push: 0
  const p = settleAH(0, 0, evenOdds, stake20);
  assert.strictEqual(p.outcome, 'push');
  assert.strictEqual(p.profit, 0);

  // halfloss: -20 / 2 = -10.00
  const hl = settleAH(0, -0.25, evenOdds, stake20);
  assert.strictEqual(hl.outcome, 'halfloss');
  assert.strictEqual(hl.profit, -10.00);

  // loss: -20.00
  const l = settleAH(-1, 0, evenOdds, stake20);
  assert.strictEqual(l.outcome, 'loss');
  assert.strictEqual(l.profit, -20.00);
});

// 22. Non-quarter identity check (ensuring split halves equal full stake without double-counting)
test('Non-quarter identity check: lines 0, 0.5, 1.0, 1.5, 2.0 compute identical profit to direct single-line math', () => {
  const lines = [-2.0, -1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5, 2.0];
  const testStake = 40;
  const testOdds = 1.95;

  lines.forEach(l => {
    for (let diff = -4; diff <= 4; diff++) {
      const res = settleAH(diff, l, testOdds, testStake);
      const net = diff + l;
      if (net > 0) {
        assert.strictEqual(res.outcome, 'win');
        assert.strictEqual(res.profit, Math.round(testStake * (testOdds - 1) * 100) / 100);
      } else if (net === 0) {
        assert.strictEqual(res.outcome, 'push');
        assert.strictEqual(res.profit, 0);
      } else {
        assert.strictEqual(res.outcome, 'loss');
        assert.strictEqual(res.profit, -testStake);
      }
    }
  });
});

// 23. Exhaustive check: outcome is NEVER "unknown" for any integer goal difference across all lines
test('Exhaustive verification: settleAH outcome is never "unknown" for integer goal diffs', () => {
  const allLines = [
    -3.0, -2.75, -2.5, -2.25, -2.0, -1.75, -1.5, -1.25,
    -1.0, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75,
    1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0
  ];
  const validOutcomes = new Set(['win', 'halfwin', 'push', 'halfloss', 'loss']);

  allLines.forEach(l => {
    for (let diff = -10; diff <= 10; diff++) {
      const res = settleAH(diff, l, 1.90, 10);
      assert.ok(validOutcomes.has(res.outcome), `Unexpected outcome ${res.outcome} for line=${l}, diff=${diff}`);
      assert.notStrictEqual(res.outcome, 'unknown');
    }
  });
});

// 14. Full Match Scenarios: Home vs Away sides
test('Match scenario 1: FTHG=2, FTAG=1, AHh=-0.75, oddsH=1.95, oddsA=1.90', () => {
  const fthg = 2;
  const ftag = 1;
  const ahLine = -0.75;
  const oddsH = 1.95;
  const oddsA = 1.90;

  // Backing Home: diff = 2 - 1 = 1, line = -0.75
  const homeRes = settleAH(fthg - ftag, ahLine, oddsH, STAKE);
  assert.strictEqual(homeRes.outcome, 'halfwin');
  assert.strictEqual(homeRes.profit, Math.round((STAKE / 2 * (oddsH - 1)) * 100) / 100);

  // Backing Away: diff = 1 - 2 = -1, line = -(-0.75) = +0.75
  const awayRes = settleAH(ftag - fthg, -ahLine, oddsA, STAKE);
  assert.strictEqual(awayRes.outcome, 'halfloss');
  assert.strictEqual(awayRes.profit, -STAKE / 2);
});

test('Match scenario 2: FTHG=1, FTAG=1 (draw), AHh=-0.25, oddsH=2.00, oddsA=1.85', () => {
  const fthg = 1;
  const ftag = 1;
  const ahLine = -0.25;

  // Home backs -0.25 on a draw -> halfloss
  const homeRes = settleAH(fthg - ftag, ahLine, 2.00, STAKE);
  assert.strictEqual(homeRes.outcome, 'halfloss');
  assert.strictEqual(homeRes.profit, -5.00);

  // Away backs +0.25 on a draw -> halfwin
  const awayRes = settleAH(ftag - fthg, -ahLine, 1.85, STAKE);
  assert.strictEqual(awayRes.outcome, 'halfwin');
  assert.strictEqual(awayRes.profit, 4.25);
});

test('Match scenario 3: FTHG=3, FTAG=1, AHh=-1.0, oddsH=1.80, oddsA=2.05', () => {
  const fthg = 3;
  const ftag = 1;
  const ahLine = -1.0;

  // Home wins by 2 on -1.0 -> full win
  const homeRes = settleAH(fthg - ftag, ahLine, 1.80, STAKE);
  assert.strictEqual(homeRes.outcome, 'win');
  assert.strictEqual(homeRes.profit, 8.00);

  // Away loses by 2 on +1.0 -> full loss
  const awayRes = settleAH(ftag - fthg, -ahLine, 2.05, STAKE);
  assert.strictEqual(awayRes.outcome, 'loss');
  assert.strictEqual(awayRes.profit, -10.00);
});

test('Match scenario 4: FTHG=1, FTAG=2, AHh=+0.5, oddsH=2.10, oddsA=1.75', () => {
  const fthg = 1;
  const ftag = 2;
  const ahLine = 0.5;

  // Home: diff = -1, line = 0.5 -> net -0.5 -> loss
  const homeRes = settleAH(fthg - ftag, ahLine, 2.10, STAKE);
  assert.strictEqual(homeRes.outcome, 'loss');
  assert.strictEqual(homeRes.profit, -10.00);

  // Away: diff = +1, line = -0.5 -> net +0.5 -> win
  const awayRes = settleAH(ftag - fthg, -ahLine, 1.75, STAKE);
  assert.strictEqual(awayRes.outcome, 'win');
  assert.strictEqual(awayRes.profit, 7.50);
});

// 24. Argument validation: Number.isFinite rejects NaN, Infinity, non-numbers with TypeError
test('Argument validation: settleAH throws TypeError on NaN, Infinity, or non-finite numbers', () => {
  assert.throws(() => settleAH(NaN, 0, 1.9, 10), TypeError);
  assert.throws(() => settleAH(1, NaN, 1.9, 10), TypeError);
  assert.throws(() => settleAH(1, 0, NaN, 10), TypeError);
  assert.throws(() => settleAH(1, 0, 1.9, NaN), TypeError);

  assert.throws(() => settleAH(Infinity, 0, 1.9, 10), TypeError);
  assert.throws(() => settleAH(1, -Infinity, 1.9, 10), TypeError);
  assert.throws(() => settleAH(1, 0, Infinity, 10), TypeError);
  assert.throws(() => settleAH(1, 0, 1.9, Infinity), TypeError);

  assert.throws(() => settleAH('1', 0, 1.9, 10), TypeError);
  assert.throws(() => settleAH(1, null, 1.9, 10), TypeError);
  assert.throws(() => settleAH(1, 0, undefined, 10), TypeError);
  assert.throws(() => settleAH(), TypeError);
});

console.log(`\nResults: ${passedCount} / ${totalCount} tests passed.`);
if (passedCount === totalCount) {
  console.log('✅ ALL ASIAN HANDICAP UNIT TESTS PASSED!');
} else {
  console.error(`❌ ${totalCount - passedCount} tests failed.`);
  process.exit(1);
}
