/**
 * ah.js - Asian Handicap Settlement Logic
 * Pure function with zero external dependencies.
 * Works both in browser (window.settleAH) and in Node.js (module.exports).
 */

(function (global) {
  'use strict';

  /**
   * Settles an Asian Handicap bet.
   *
   * @param {number} goalDiffForBackedSide - Goal difference for the backed side:
   *   (e.g., FTHG - FTAG for Home, or FTAG - FTHG for Away).
   * @param {number} line - Handicap line for the backed side:
   *   (e.g., AHh for Home, -AHh for Away).
   * @param {number} odds - Decimal odds (e.g., 1.95).
   * @param {number} stake - Bet stake amount (e.g., 10).
   * @returns {{ profit: number, outcome: 'win' | 'halfwin' | 'push' | 'halfloss' | 'loss' }}
   */
  function settleAH(goalDiffForBackedSide, line, odds, stake) {
    if (typeof goalDiffForBackedSide !== 'number' || typeof line !== 'number' ||
        typeof odds !== 'number' || typeof stake !== 'number') {
      throw new TypeError('Invalid arguments to settleAH');
    }

    // Check if line is a quarter handicap (ends in .25 or .75)
    // Quarter lines split the stake into two halves on adjacent half/whole lines:
    // L1 = line - 0.25, L2 = line + 0.25
    const isQuarter = Math.abs(Math.round(line * 4) % 2) === 1;
    const l1 = isQuarter ? Math.round((line - 0.25) * 100) / 100 : line;
    const l2 = isQuarter ? Math.round((line + 0.25) * 100) / 100 : line;
    const halfStake = stake / 2;

    function evalSubLine(subLine) {
      const net = Math.round((goalDiffForBackedSide + subLine) * 1000) / 1000;
      if (net > 0) {
        return { outcome: 'win', profit: halfStake * (odds - 1) };
      }
      if (net === 0) {
        return { outcome: 'push', profit: 0 };
      }
      return { outcome: 'loss', profit: -halfStake };
    }

    const r1 = evalSubLine(l1);
    const r2 = evalSubLine(l2);

    let outcome;
    if (r1.outcome === 'win' && r2.outcome === 'win') {
      outcome = 'win';
    } else if (r1.outcome === 'loss' && r2.outcome === 'loss') {
      outcome = 'loss';
    } else if (r1.outcome === 'push' && r2.outcome === 'push') {
      outcome = 'push';
    } else if ((r1.outcome === 'win' && r2.outcome === 'push') || (r1.outcome === 'push' && r2.outcome === 'win')) {
      outcome = 'halfwin';
    } else if ((r1.outcome === 'loss' && r2.outcome === 'push') || (r1.outcome === 'push' && r2.outcome === 'loss')) {
      outcome = 'halfloss';
    } else {
      outcome = 'unknown';
    }

    // Round profit to 2 decimal places to eliminate floating point imprecision
    const rawProfit = r1.profit + r2.profit;
    const profit = Math.round(rawProfit * 100) / 100;

    return {
      profit,
      outcome
    };
  }

  // Export for Node.js / CommonJS
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { settleAH };
  }

  // Export for Browser global
  if (typeof window !== 'undefined') {
    window.settleAH = settleAH;
  } else if (typeof global !== 'undefined') {
    global.settleAH = settleAH;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
