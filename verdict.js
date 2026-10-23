/**
 * verdict.js - Game End Verdict Calculation
 * Pure function with zero external dependencies.
 * Works both in browser (window.calculateVerdict) and in Node.js (module.exports).
 */

(function (global) {
  'use strict';

  /**
   * Calculates the end-game verdict.
   *
   * @param {number|object} playerFinal - Player's final bankroll (or options object)
   * @param {number} [baselineFinal] - Computer opponent's final bankroll
   * @param {number} [startingBankroll=100] - Starting bankroll amount
   * @returns {{
   *   title: string,
   *   subtitle: string,
   *   detail: string,
   *   bookiePnlText: string,
   *   statusClass: 'win' | 'loss' | 'draw',
   *   trophy: string,
   *   playerNet: number,
   *   baselineNet: number,
   *   diffVsAI: number
   * }}
   */
  function calculateVerdict(playerFinal, baselineFinal, startingBankroll = 100) {
    // Support object argument invocation: calculateVerdict({ playerFinal, baselineFinal, startingBankroll })
    if (typeof playerFinal === 'object' && playerFinal !== null) {
      const opts = playerFinal;
      baselineFinal = opts.baselineFinal;
      startingBankroll = opts.startingBankroll !== undefined ? opts.startingBankroll : 100;
      playerFinal = opts.playerFinal;
    }

    if (!Number.isFinite(playerFinal) || !Number.isFinite(baselineFinal) || !Number.isFinite(startingBankroll)) {
      throw new TypeError('All arguments to calculateVerdict must be finite numbers');
    }

    // Round net values to 0.1 to avoid floating point precision artifacts (e.g. 96.4 - 100 = -3.6)
    // Normalize -0 to 0 via (x || 0)
    const playerNet = (Math.round((playerFinal - startingBankroll) * 10) / 10) || 0;
    const baselineNet = (Math.round((baselineFinal - startingBankroll) * 10) / 10) || 0;
    const diffVsAI = (Math.round((playerFinal - baselineFinal) * 10) / 10) || 0;

    const absPlayerNet = Math.abs(playerNet).toFixed(1);
    const absDiff = Math.abs(diffVsAI).toFixed(1);

    let title = '';
    let subtitle = '';
    let detail = '';
    let bookiePnlText = '';
    let statusClass = 'draw'; // 'win' | 'loss' | 'draw'
    let trophy = '🤝';

    // 1. Main Title & Status (Strictly determined by playerNet against the Bookie)
    if (playerNet > 0) {
      title = '贏咗莊家！';
      statusClass = 'win';
      trophy = '🏆';
      bookiePnlText = `你今局贏咗莊家 ${absPlayerNet} 注`;
    } else if (playerNet < 0) {
      title = '輸給莊家';
      statusClass = 'loss';
      trophy = '📉';
      bookiePnlText = `莊家今局喺你身上贏咗 ${absPlayerNet} 注`;
    } else {
      title = '打和 / 保本';
      statusClass = 'draw';
      trophy = '🤝';
      bookiePnlText = '今局同莊家打和（保本不失）';
    }

    // 2. Subtitle & Detail (Independent evaluation vs Computer Opponent)
    if (playerNet > 0) {
      // Player WON against Bookie
      if (diffVsAI > 0) {
        subtitle = `仲贏埋電腦對手 ${absDiff} 注`;
        detail = '犀利！你成功戰勝莊家抽水，而且成績好過盲跟熱門嘅電腦對手！';
      } else if (diffVsAI < 0) {
        subtitle = `但電腦對手贏你 ${absDiff} 注`;
        detail = '好嘢！你成功喺莊家手上贏到錢，不過電腦對手今局盲跟熱門斬獲更多！';
      } else {
        subtitle = '同電腦對手打和';
        detail = '好嘢！你同電腦對手雙雙擊敗莊家，戰績完全一致！';
      }
    } else if (playerNet < 0) {
      // Player LOST against Bookie
      if (diffVsAI > 0) {
        subtitle = `但你贏咗電腦對手 ${absDiff} 注`;
        detail = '雖然今局輸畀莊家抽水，但你嘅表現依然好過盲跟熱門嘅電腦對手，輸少當贏！';
      } else if (diffVsAI < 0) {
        subtitle = `電腦對手贏你 ${absDiff} 注`;
        detail = '莊家抽水無情，今局盲跟熱門策略稍勝一籌，收拾心情再接再厲！';
      } else {
        subtitle = '同電腦對手打和';
        detail = '你同電腦對手今局成績一樣，齊齊畀莊家抽水，下局再戰！';
      }
    } else {
      // Player BROKE EVEN against Bookie
      if (diffVsAI > 0) {
        subtitle = `兼且贏咗電腦對手 ${absDiff} 注`;
        detail = '成功保本不失！而且成績壓倒盲跟熱門嘅電腦對手，立於不敗之地！';
      } else if (diffVsAI < 0) {
        subtitle = `但電腦對手贏你 ${absDiff} 注`;
        detail = '成功保本不失，但電腦對手盲跟熱門賺咗少少，下局再挑戰贏莊家！';
      } else {
        subtitle = '同電腦對手打和';
        detail = '大家本金分毫不差，同莊家與電腦對手雙雙平手！';
      }
    }

    return {
      title,
      subtitle,
      detail,
      bookiePnlText,
      statusClass,
      trophy,
      playerNet,
      baselineNet,
      diffVsAI
    };
  }

  // Export for Node.js / CommonJS
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateVerdict };
  } else {
    global.calculateVerdict = calculateVerdict;
  }
})(typeof window !== 'undefined' ? window : globalThis);
