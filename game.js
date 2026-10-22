/**
 * 你估得贏莊家嗎？ (Beat the Bookie) - Game Logic
 * Pure vanilla JavaScript. Zero dependencies, file:// safe, zero network calls.
 */

(function () {
  'use strict';

  // --- Team Translations & Visual Configuration ---
  const TEAMS = {
    'Real Madrid': { zh: '皇家馬德里', en: 'Real Madrid', primary: '#ffffff', secondary: '#dab042' },
    'Barcelona': { zh: '巴塞隆拿', en: 'Barcelona', primary: '#a50044', secondary: '#004d98' },
    'Ath Madrid': { zh: '馬德里體育會', en: 'Ath Madrid', primary: '#cb3524', secondary: '#272e61' },
    'Ath Bilbao': { zh: '畢爾包', en: 'Ath Bilbao', primary: '#ee2524', secondary: '#1b1b1b' },
    'Sociedad': { zh: '皇家蘇斯達', en: 'Sociedad', primary: '#0067b1', secondary: '#ffffff' },
    'Villarreal': { zh: '維拉利爾', en: 'Villarreal', primary: '#ffd200', secondary: '#003865' },
    'Betis': { zh: '貝迪斯', en: 'Betis', primary: '#00954c', secondary: '#ffffff' },
    'Sevilla': { zh: '西維爾', en: 'Sevilla', primary: '#d40f1d', secondary: '#ffffff' },
    'Valencia': { zh: '華倫西亞', en: 'Valencia', primary: '#ff6900', secondary: '#1a1a1a' },
    'Celta': { zh: '切爾達', en: 'Celta', primary: '#7ab2e1', secondary: '#ffffff' },
    'Getafe': { zh: '赫塔菲', en: 'Getafe', primary: '#005ca9', secondary: '#ffffff' },
    'Girona': { zh: '基羅納', en: 'Girona', primary: '#ce1126', secondary: '#ffffff' },
    'Osasuna': { zh: '奧沙辛拿', en: 'Osasuna', primary: '#c01524', secondary: '#0a1c3d' },
    'Mallorca': { zh: '馬略卡', en: 'Mallorca', primary: '#e20613', secondary: '#111111' },
    'Alaves': { zh: '艾拉維斯', en: 'Alaves', primary: '#005ba9', secondary: '#ffffff' },
    'Espanol': { zh: '愛斯賓奴', en: 'Espanol', primary: '#007fc8', secondary: '#ffffff' },
    'Vallecano': { zh: '華歷簡奴', en: 'Vallecano', primary: '#ffffff', secondary: '#d40f1d' },
    'Levante': { zh: '利雲特', en: 'Levante', primary: '#7b112d', secondary: '#004b87' },
    'Elche': { zh: '艾爾切', en: 'Elche', primary: '#006341', secondary: '#ffffff' },
    'Oviedo': { zh: '奧維亞度', en: 'Oviedo', primary: '#003366', secondary: '#ffffff' },
    'Las Palmas': { zh: '拉斯彭馬斯', en: 'Las Palmas', primary: '#ffd400', secondary: '#00509d' },
    'Leganes': { zh: '雷加利斯', en: 'Leganes', primary: '#005ca9', secondary: '#ffffff' },
    'Valladolid': { zh: '華拉度列', en: 'Valladolid', primary: '#532e85', secondary: '#ffffff' }
  };

  function getTeamInfo(name) {
    if (TEAMS[name]) return TEAMS[name];
    return {
      zh: name,
      en: name,
      primary: '#1f4a32',
      secondary: '#ffd700'
    };
  }

  function sanitizeTeamKey(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '_');
  }

  function createTeamCrestSVG(teamName) {
    const info = getTeamInfo(teamName);
    const idKey = sanitizeTeamKey(teamName);
    const initials = info.en.substring(0, 3).toUpperCase();
    const c1 = info.primary;
    const c2 = info.secondary;

    return `
      <svg class="team-crest-svg" viewBox="0 0 48 54" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <clipPath id="crest-clip-${idKey}">
            <path d="M24 2 C38 2 46 8 46 22 C46 38 24 52 24 52 C24 52 2 38 2 22 C2 8 10 2 24 2 Z"/>
          </clipPath>
        </defs>
        <path d="M24 2 C38 2 46 8 46 22 C46 38 24 52 24 52 C24 52 2 38 2 22 C2 8 10 2 24 2 Z" fill="${c1}" stroke="#ffd700" stroke-width="2.5"/>
        <g clip-path="url(#crest-clip-${idKey})">
          <path d="M0 0 L48 54 L48 0 Z" fill="${c2}" opacity="0.85"/>
          <circle cx="24" cy="24" r="14" fill="rgba(10, 25, 15, 0.6)" stroke="#ffd700" stroke-width="1.2"/>
          <text x="24" y="28" text-anchor="middle" font-size="9" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, sans-serif" letter-spacing="0.5">${initials}</text>
        </g>
      </svg>
    `;
  }

  // --- Odds & Margin Mathematics ---
  /**
   * Margin-removed implied probabilities:
   * r_i = 1 / o_i
   * S = r_H + r_D + r_A (overround)
   * margin % = (S - 1) * 100
   * p_i = (r_i / S) * 100
   */
  function calculateOddsMath(odds) {
    const rH = 1 / odds.h;
    const rD = 1 / odds.d;
    const rA = 1 / odds.a;
    const overround = rH + rD + rA;
    const marginPct = (overround - 1) * 100;

    const pH = (rH / overround) * 100;
    const pD = (rD / overround) * 100;
    const pA = (rA / overround) * 100;

    // Determine Favourite (lowest odds)
    const minOdds = Math.min(odds.h, odds.d, odds.a);
    let fav = 'H';
    if (odds.h === minOdds) fav = 'H';
    else if (odds.a === minOdds) fav = 'A';
    else fav = 'D';

    return {
      marginPct,
      pH,
      pD,
      pA,
      fav,
      minOdds
    };
  }

  // --- LocalStorage Best Score Handling ---
  const STORAGE_KEY = 'btb_best';

  function getBestScore() {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      if (val !== null) {
        const num = parseFloat(val);
        if (!isNaN(num)) return num;
      }
    } catch (e) {
      // Graceful fallback for file:// or private sandbox
    }
    return null;
  }

  function saveBestScore(score) {
    try {
      const cur = getBestScore();
      if (cur === null || score > cur) {
        localStorage.setItem(STORAGE_KEY, score.toFixed(1));
        return true; // new high score
      }
    } catch (e) {
      // Graceful fallback
    }
    return false;
  }

  // --- Utility Functions ---
  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function formatNum(val) {
    const r = Math.round(val * 10) / 10;
    return r.toFixed(1);
  }

  function formatPL(val) {
    const r = Math.round(val * 10) / 10;
    if (r > 0) return `+${r.toFixed(1)}`;
    return r.toFixed(1);
  }

  // --- Game State ---
  const STAKE_PER_MATCH = 10;
  const EXACT_SCORE_BONUS = 20;
  const TOTAL_ROUNDS = 10;

  const state = {
    selectedSeason: '2025/26',
    sessionMatches: [],
    currentRoundIdx: 0,
    playerBankroll: 100.0,
    baselineBankroll: 100.0,
    isRoundRevealed: false,
    selectedPick: null, // 'H' | 'D' | 'A'
    exactScoreActive: false,
    guessHome: 1,
    guessAway: 0,
    sessionRecap: []
  };

  // --- DOM Elements ---
  const DOM = {
    // Screens
    startScreen: document.getElementById('start-screen'),
    gameScreen: document.getElementById('game-screen'),
    endScreen: document.getElementById('end-screen'),

    // Start Screen
    seasonBtns: document.querySelectorAll('.season-btn'),
    bestScoreDisplay: document.getElementById('best-score-display'),
    startGameBtn: document.getElementById('start-game-btn'),

    // Game HUD
    hudRoundText: document.getElementById('hud-round-text'),
    hudSeason: document.getElementById('hud-season'),
    hudDate: document.getElementById('hud-date'),
    playerBankrollDisplay: document.getElementById('player-bankroll-display'),
    playerChangeDisplay: document.getElementById('player-change-display'),
    baselineBankrollDisplay: document.getElementById('baseline-bankroll-display'),
    baselineChangeDisplay: document.getElementById('baseline-change-display'),

    // Match Teams & Center Score
    homeCrest: document.getElementById('home-crest'),
    homeTeamZh: document.getElementById('home-team-zh'),
    homeTeamEn: document.getElementById('home-team-en'),
    awayCrest: document.getElementById('away-crest'),
    awayTeamZh: document.getElementById('away-team-zh'),
    awayTeamEn: document.getElementById('away-team-en'),
    vsBadge: document.getElementById('vs-badge'),
    revealedScoreBox: document.getElementById('revealed-score-box'),
    ftScoreText: document.getElementById('ft-score-text'),
    subScoreText: document.getElementById('sub-score-text'),
    outcomeTag: document.getElementById('outcome-tag'),

    // Bookmaker board
    marginValueDisplay: document.getElementById('margin-value-display'),
    btnPickH: document.getElementById('btn-pick-h'),
    btnPickD: document.getElementById('btn-pick-d'),
    btnPickA: document.getElementById('btn-pick-a'),
    oddsValH: document.getElementById('odds-val-h'),
    oddsValD: document.getElementById('odds-val-d'),
    oddsValA: document.getElementById('odds-val-a'),
    probValH: document.getElementById('prob-val-h'),
    probValD: document.getElementById('prob-val-d'),
    probValA: document.getElementById('prob-val-a'),
    favBadgeH: document.getElementById('fav-badge-h'),
    favBadgeD: document.getElementById('fav-badge-d'),
    favBadgeA: document.getElementById('fav-badge-a'),

    // Exact Score
    exactScoreToggle: document.getElementById('exact-score-toggle'),
    exactScoreSteppers: document.getElementById('exact-score-steppers'),
    stepperHomeName: document.getElementById('stepper-home-name'),
    stepperAwayName: document.getElementById('stepper-away-name'),
    stepperHomeMinus: document.getElementById('stepper-home-minus'),
    stepperHomePlus: document.getElementById('stepper-home-plus'),
    stepperHomeVal: document.getElementById('stepper-home-val'),
    stepperAwayMinus: document.getElementById('stepper-away-minus'),
    stepperAwayPlus: document.getElementById('stepper-away-plus'),
    stepperAwayVal: document.getElementById('stepper-away-val'),
    clearScoreBtn: document.getElementById('clear-score-btn'),

    // Reveal Action
    revealBtn: document.getElementById('reveal-btn'),
    revealBtnText: document.getElementById('reveal-btn-text'),
    roundResultCard: document.getElementById('round-result-card'),
    resultStatusIcon: document.getElementById('result-status-icon'),
    statusMainText: document.getElementById('status-main-text'),
    statusSubText: document.getElementById('status-sub-text'),
    playerRoundPl: document.getElementById('player-round-pl'),
    baselineRoundPl: document.getElementById('baseline-round-pl'),
    nextRoundBtn: document.getElementById('next-round-btn'),

    // End Screen
    endTrophyBadge: document.getElementById('end-trophy-badge'),
    verdictBanner: document.getElementById('verdict-banner'),
    verdictText: document.getElementById('verdict-text'),
    verdictDetail: document.getElementById('verdict-detail'),
    statFinalBankroll: document.getElementById('stat-final-bankroll'),
    statNetPl: document.getElementById('stat-net-pl'),
    statBaselineBankroll: document.getElementById('stat-baseline-bankroll'),
    statBaselinePl: document.getElementById('stat-baseline-pl'),
    statHitRate: document.getElementById('stat-hit-rate'),
    statHitPct: document.getElementById('stat-hit-pct'),
    statScoreHits: document.getElementById('stat-score-hits'),
    statRoi: document.getElementById('stat-roi'),
    endBestScore: document.getElementById('end-best-score'),
    endRecordSub: document.getElementById('end-record-sub'),
    recapListContainer: document.getElementById('recap-list-container'),
    replayBtn: document.getElementById('replay-btn'),
    homeBtn: document.getElementById('home-btn')
  };

  // --- Screen Switching ---
  function showScreen(screenEl) {
    [DOM.startScreen, DOM.gameScreen, DOM.endScreen].forEach(el => {
      el.classList.remove('active');
    });
    screenEl.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Initial Start Screen Setup ---
  function updateStartScreenBestScore() {
    const best = getBestScore();
    if (best !== null) {
      DOM.bestScoreDisplay.textContent = `${formatNum(best)} 注`;
    } else {
      DOM.bestScoreDisplay.textContent = '暫無紀錄（挑戰開創首個紀錄！）';
    }
  }

  function initStartScreen() {
    updateStartScreenBestScore();

    DOM.seasonBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.seasonBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        state.selectedSeason = btn.dataset.season;
      });
    });

    DOM.startGameBtn.addEventListener('click', startNewGame);
  }

  // --- Game Initialization ---
  function startNewGame() {
    if (!window.MATCHES || !Array.isArray(window.MATCHES) || window.MATCHES.length === 0) {
      alert('未載入比賽數據！請先執行 python3 build_data.py 生成 data.js。');
      return;
    }

    // Filter matches by selected season
    let pool = window.MATCHES;
    if (state.selectedSeason === '2025/26' || state.selectedSeason === '2024/25') {
      pool = window.MATCHES.filter(m => m.season === state.selectedSeason);
    }

    if (pool.length < TOTAL_ROUNDS) {
      alert('賽事池數量不足，無法開始。');
      return;
    }

    // Pick 10 distinct random matches
    state.sessionMatches = shuffleArray(pool).slice(0, TOTAL_ROUNDS);
    state.currentRoundIdx = 0;
    state.playerBankroll = 100.0;
    state.baselineBankroll = 100.0;
    state.sessionRecap = [];

    showScreen(DOM.gameScreen);
    loadRound(state.currentRoundIdx);
  }

  // --- Load Round ---
  function loadRound(roundIdx) {
    const match = state.sessionMatches[roundIdx];
    const oddsMath = calculateOddsMath(match.odds);

    state.isRoundRevealed = false;
    state.selectedPick = null;
    state.exactScoreActive = false;
    state.guessHome = 1;
    state.guessAway = 0;

    // HUD Update
    DOM.hudRoundText.textContent = `第 ${roundIdx + 1} / ${TOTAL_ROUNDS} 場`;
    DOM.hudSeason.textContent = match.season;
    DOM.hudDate.textContent = match.date;
    DOM.playerBankrollDisplay.innerHTML = `${formatNum(state.playerBankroll)} <span class="unit">注</span>`;
    DOM.baselineBankrollDisplay.innerHTML = `${formatNum(state.baselineBankroll)} <span class="unit">注</span>`;
    DOM.playerChangeDisplay.textContent = '±0.0';
    DOM.playerChangeDisplay.className = 'bankroll-change';
    DOM.baselineChangeDisplay.textContent = '±0.0';
    DOM.baselineChangeDisplay.className = 'bankroll-change';

    // Teams board
    const homeInfo = getTeamInfo(match.home);
    const awayInfo = getTeamInfo(match.away);

    DOM.homeCrest.innerHTML = createTeamCrestSVG(match.home);
    DOM.homeTeamZh.textContent = homeInfo.zh;
    DOM.homeTeamEn.textContent = homeInfo.en;

    DOM.awayCrest.innerHTML = createTeamCrestSVG(match.away);
    DOM.awayTeamZh.textContent = awayInfo.zh;
    DOM.awayTeamEn.textContent = awayInfo.en;

    // Score center: reset to VS
    DOM.vsBadge.style.display = 'block';
    DOM.revealedScoreBox.style.display = 'none';

    // Bookmaker Margin & Odds
    DOM.marginValueDisplay.textContent = `${oddsMath.marginPct.toFixed(1)}%`;
    DOM.oddsValH.textContent = match.odds.h.toFixed(2);
    DOM.oddsValD.textContent = match.odds.d.toFixed(2);
    DOM.oddsValA.textContent = match.odds.a.toFixed(2);

    DOM.probValH.textContent = `${oddsMath.pH.toFixed(1)}%`;
    DOM.probValD.textContent = `${oddsMath.pD.toFixed(1)}%`;
    DOM.probValA.textContent = `${oddsMath.pA.toFixed(1)}%`;

    // Favourite Badge Slot
    DOM.favBadgeH.innerHTML = oddsMath.fav === 'H' ? '<span class="fav-badge">莊家熱門 🔥</span>' : '';
    DOM.favBadgeD.innerHTML = oddsMath.fav === 'D' ? '<span class="fav-badge">莊家熱門 🔥</span>' : '';
    DOM.favBadgeA.innerHTML = oddsMath.fav === 'A' ? '<span class="fav-badge">莊家熱門 🔥</span>' : '';

    // Clear pick selection
    [DOM.btnPickH, DOM.btnPickD, DOM.btnPickA].forEach(btn => {
      btn.classList.remove('selected');
      btn.disabled = false;
      btn.setAttribute('aria-pressed', 'false');
    });

    // Reset Exact Score Panel
    DOM.exactScoreToggle.checked = false;
    DOM.exactScoreSteppers.style.display = 'none';
    DOM.stepperHomeName.textContent = homeInfo.zh;
    DOM.stepperAwayName.textContent = awayInfo.zh;
    DOM.stepperHomeVal.textContent = '1';
    DOM.stepperAwayVal.textContent = '0';

    // Reset Reveal Actions
    DOM.revealBtn.style.display = 'flex';
    DOM.revealBtn.disabled = true;
    DOM.revealBtnText.textContent = '請先選擇「主勝 / 和局 / 客勝」';
    DOM.roundResultCard.style.display = 'none';

    // Next round button label
    if (roundIdx === TOTAL_ROUNDS - 1) {
      DOM.nextRoundBtn.innerHTML = '<span>查看最終戰報</span> <span class="btn-icon">🏆</span>';
    } else {
      DOM.nextRoundBtn.innerHTML = '<span>下一場</span> <span class="btn-icon">⏩</span>';
    }
  }

  // --- Pick Selection Handling ---
  function handlePick(pick) {
    if (state.isRoundRevealed) return;

    state.selectedPick = pick;

    [
      { btn: DOM.btnPickH, key: 'H' },
      { btn: DOM.btnPickD, key: 'D' },
      { btn: DOM.btnPickA, key: 'A' }
    ].forEach(item => {
      const isSelected = item.key === pick;
      item.btn.classList.toggle('selected', isSelected);
      item.btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });

    const labelMap = { H: '主勝 (1)', D: '和局 (X)', A: '客勝 (2)' };
    DOM.revealBtn.disabled = false;
    DOM.revealBtnText.textContent = `確認下注【${labelMap[pick]}】· 揭曉賽果 📢`;
  }

  // --- Exact Score Stepper Handling ---
  function updateScoreDisplay() {
    DOM.stepperHomeVal.textContent = state.guessHome;
    DOM.stepperAwayVal.textContent = state.guessAway;
  }

  function handleScoreToggle() {
    state.exactScoreActive = DOM.exactScoreToggle.checked;
    DOM.exactScoreSteppers.style.display = state.exactScoreActive ? 'flex' : 'none';
    if (state.exactScoreActive) {
      updateScoreDisplay();
    }
  }

  function clearExactScore() {
    DOM.exactScoreToggle.checked = false;
    state.exactScoreActive = false;
    DOM.exactScoreSteppers.style.display = 'none';
  }

  // --- Reveal Result Logic ---
  function revealRound() {
    if (state.isRoundRevealed || !state.selectedPick) return;

    state.isRoundRevealed = true;
    const match = state.sessionMatches[state.currentRoundIdx];
    const oddsMath = calculateOddsMath(match.odds);

    // Disable odds buttons
    [DOM.btnPickH, DOM.btnPickD, DOM.btnPickA].forEach(btn => btn.disabled = true);

    // 1. Calculate Player 1X2 P/L: correct pick -> +10*(odds-1), wrong -> -10
    const playerPickedOdds = match.odds[state.selectedPick.toLowerCase()];
    const isHit1x2 = state.selectedPick === match.ftr;
    let playerPL_1x2 = 0;
    if (isHit1x2) {
      playerPL_1x2 = STAKE_PER_MATCH * (playerPickedOdds - 1);
    } else {
      playerPL_1x2 = -STAKE_PER_MATCH;
    }

    // 2. Calculate Exact Score Bonus: if exact score correct -> +20 units
    let isHitScore = false;
    let exactScoreBonus = 0;
    if (state.exactScoreActive) {
      if (state.guessHome === match.fthg && state.guessAway === match.ftag) {
        isHitScore = true;
        exactScoreBonus = EXACT_SCORE_BONUS;
      }
    }

    const totalPlayerRoundPL = playerPL_1x2 + exactScoreBonus;
    state.playerBankroll += totalPlayerRoundPL;

    // 3. Calculate Baseline AI P/L: virtual player always backs the favourite with same stake (10)
    const baselineFav = oddsMath.fav;
    const baselineOdds = match.odds[baselineFav.toLowerCase()];
    const isBaselineHit = baselineFav === match.ftr;
    let baselineRoundPL = 0;
    if (isBaselineHit) {
      baselineRoundPL = STAKE_PER_MATCH * (baselineOdds - 1);
    } else {
      baselineRoundPL = -STAKE_PER_MATCH;
    }
    state.baselineBankroll += baselineRoundPL;

    // Save recap data for this match
    state.sessionRecap.push({
      round: state.currentRoundIdx + 1,
      match: match,
      playerPick: state.selectedPick,
      playerOdds: playerPickedOdds,
      isHit1x2: isHit1x2,
      exactScoreActive: state.exactScoreActive,
      guessHome: state.guessHome,
      guessAway: state.guessAway,
      isHitScore: isHitScore,
      playerRoundPL: totalPlayerRoundPL,
      baselineFav: baselineFav,
      baselineOdds: baselineOdds,
      isBaselineHit: isBaselineHit,
      baselineRoundPL: baselineRoundPL,
      playerBankrollAfter: state.playerBankroll,
      baselineBankrollAfter: state.baselineBankroll
    });

    // --- UI Update on Reveal ---
    // Show match final score & sub stats
    DOM.vsBadge.style.display = 'none';
    DOM.revealedScoreBox.style.display = 'flex';
    DOM.ftScoreText.textContent = `${match.fthg} - ${match.ftag}`;

    let subText = '';
    if (match.hthg !== null && match.htag !== null) {
      subText += `半場 ${match.hthg}-${match.htag}`;
    }
    if (match.hs !== null && match.as !== null) {
      if (subText) subText += ' ｜ ';
      subText += `射門 ${match.hs}-${match.as}`;
    }
    DOM.subScoreText.textContent = subText || '全場完';

    const outcomeLabels = { H: '主勝', D: '和局', A: '客勝' };
    DOM.outcomeTag.textContent = outcomeLabels[match.ftr];

    // Update bankroll displays in HUD
    DOM.playerBankrollDisplay.innerHTML = `${formatNum(state.playerBankroll)} <span class="unit">注</span>`;
    DOM.baselineBankrollDisplay.innerHTML = `${formatNum(state.baselineBankroll)} <span class="unit">注</span>`;

    DOM.playerChangeDisplay.textContent = `${formatPL(totalPlayerRoundPL)} 注`;
    DOM.playerChangeDisplay.className = `bankroll-change ${totalPlayerRoundPL >= 0 ? 'pos' : 'neg'}`;

    DOM.baselineChangeDisplay.textContent = `${formatPL(baselineRoundPL)} 注`;
    DOM.baselineChangeDisplay.className = `bankroll-change ${baselineRoundPL >= 0 ? 'pos' : 'neg'}`;

    // Reveal Result Card Content
    DOM.revealBtn.style.display = 'none';
    DOM.roundResultCard.style.display = 'flex';

    if (isHit1x2) {
      DOM.resultStatusIcon.textContent = '🎉';
      DOM.statusMainText.textContent = `命中【${outcomeLabels[state.selectedPick]}】！獲利 ${formatPL(playerPL_1x2)} 注`;
    } else {
      DOM.resultStatusIcon.textContent = '❌';
      DOM.statusMainText.textContent = `未中【${outcomeLabels[state.selectedPick]}】！損失 -10.0 注`;
    }

    if (state.exactScoreActive) {
      if (isHitScore) {
        DOM.statusSubText.textContent = `🎯 波膽猜測 ${state.guessHome}-${state.guessAway} 命中！特別獎勵 +20.0 注！`;
        DOM.statusSubText.style.color = '#ffd700';
      } else {
        DOM.statusSubText.textContent = `波膽猜測 ${state.guessHome}-${state.guessAway} 不中（實際 ${match.fthg}-${match.ftag}）`;
        DOM.statusSubText.style.color = '';
      }
    } else {
      DOM.statusSubText.textContent = '今場未有兼估波膽';
      DOM.statusSubText.style.color = '';
    }

    DOM.playerRoundPl.textContent = `${formatPL(totalPlayerRoundPL)} 注`;
    DOM.playerRoundPl.style.color = totalPlayerRoundPL >= 0 ? '#38ef7d' : '#ff4757';

    DOM.baselineRoundPl.textContent = `${formatPL(baselineRoundPL)} 注 (買${outcomeLabels[baselineFav]} ${baselineOdds.toFixed(2)})`;
    DOM.baselineRoundPl.style.color = baselineRoundPL >= 0 ? '#38ef7d' : '#ff4757';
  }

  // --- Advance to Next Round or End Screen ---
  function advanceNextRound() {
    if (state.currentRoundIdx < TOTAL_ROUNDS - 1) {
      state.currentRoundIdx++;
      loadRound(state.currentRoundIdx);
    } else {
      showEndScreen();
    }
  }

  // --- End Screen & Summary ---
  function showEndScreen() {
    showScreen(DOM.endScreen);

    const playerFinal = state.playerBankroll;
    const baselineFinal = state.baselineBankroll;
    const netPL = playerFinal - 100.0;
    const baselineNetPL = baselineFinal - 100.0;

    // Total ROI: (Final - 100) / 100 * 100%
    const roiPct = netPL;

    // Hit rates
    const hit1x2Count = state.sessionRecap.filter(r => r.isHit1x2).length;
    const exactHitCount = state.sessionRecap.filter(r => r.isHitScore).length;

    // Verdict determination
    DOM.verdictBanner.className = 'verdict-banner';
    if (playerFinal > baselineFinal) {
      DOM.endTrophyBadge.textContent = '🏆';
      DOM.verdictBanner.classList.add('win');
      DOM.verdictText.textContent = '贏咗莊家！';
      DOM.verdictDetail.textContent = '犀利！你嘅眼光同投注策略成功壓倒盲跟熱門嘅 AI，打破莊家抽水定律！';
    } else if (playerFinal < baselineFinal) {
      DOM.endTrophyBadge.textContent = '📉';
      DOM.verdictBanner.classList.add('loss');
      DOM.verdictText.textContent = '輸畀莊家！';
      DOM.verdictDetail.textContent = '今局盲跟熱門策略稍勝一籌，莊家抽水依然強橫，收拾心情再戰一回！';
    } else {
      DOM.endTrophyBadge.textContent = '🤝';
      DOM.verdictBanner.classList.add('draw');
      DOM.verdictText.textContent = '打和！平分秋色！';
      DOM.verdictDetail.textContent = '同跟莊熱門 AI 最終同分，不分勝負！';
    }

    // Best Score check & update
    const previousBest = getBestScore();
    const isNewRecord = saveBestScore(playerFinal);
    const currentBest = getBestScore();

    DOM.endBestScore.textContent = `${formatNum(currentBest !== null ? currentBest : playerFinal)} 注`;
    if (isNewRecord && (previousBest === null || playerFinal > previousBest)) {
      DOM.endRecordSub.textContent = '🎉 刷新個人最高紀錄！';
      DOM.endRecordSub.style.color = '#ffd700';
    } else {
      DOM.endRecordSub.textContent = '維持紀錄';
      DOM.endRecordSub.style.color = '';
    }

    // Fill stats cards
    DOM.statFinalBankroll.innerHTML = `${formatNum(playerFinal)} <span class="sub-unit">注</span>`;
    DOM.statNetPl.textContent = `淨損益：${formatPL(netPL)} 注`;

    DOM.statBaselineBankroll.innerHTML = `${formatNum(baselineFinal)} <span class="sub-unit">注</span>`;
    DOM.statBaselinePl.textContent = `淨損益：${formatPL(baselineNetPL)} 注`;

    DOM.statHitRate.textContent = `${hit1x2Count} / ${TOTAL_ROUNDS}`;
    DOM.statHitPct.textContent = `勝率 ${(hit1x2Count / TOTAL_ROUNDS * 100).toFixed(1)}%`;

    DOM.statScoreHits.textContent = `${exactHitCount} / ${TOTAL_ROUNDS}`;
    DOM.statRoi.textContent = `${formatPL(roiPct)}%`;

    // Render 10-match Recap List
    const outcomeLabels = { H: '主勝', D: '和局', A: '客勝' };
    DOM.recapListContainer.innerHTML = '';

    state.sessionRecap.forEach(r => {
      const homeInfo = getTeamInfo(r.match.home);
      const awayInfo = getTeamInfo(r.match.away);
      const row = document.createElement('div');
      row.className = 'recap-item';

      let pickDesc = `你揀：${outcomeLabels[r.playerPick]} (${r.playerOdds.toFixed(2)})`;
      if (r.exactScoreActive) {
        pickDesc += ` · 波膽 ${r.guessHome}-${r.guessAway}`;
        if (r.isHitScore) pickDesc += ' 🎯中';
      }

      const plClass = r.playerRoundPL >= 0 ? 'win' : 'loss';

      row.innerHTML = `
        <div class="recap-round-num">#${r.round}</div>
        <div class="recap-match-details">
          <div class="recap-fixture">
            ${homeInfo.zh} <span class="ft-score">${r.match.fthg} - ${r.match.ftag}</span> ${awayInfo.zh}
          </div>
          <div class="recap-picks">
            ${pickDesc} ｜ 賽果：${outcomeLabels[r.match.ftr]}
          </div>
        </div>
        <div class="recap-pl-badge ${plClass}">
          ${formatPL(r.playerRoundPL)} 注
        </div>
      `;
      DOM.recapListContainer.appendChild(row);
    });
  }

  // --- Event Listeners Setup ---
  function setupEvents() {
    // 1X2 choice clicks
    DOM.btnPickH.addEventListener('click', () => handlePick('H'));
    DOM.btnPickD.addEventListener('click', () => handlePick('D'));
    DOM.btnPickA.addEventListener('click', () => handlePick('A'));

    // Exact score toggle & steppers
    DOM.exactScoreToggle.addEventListener('change', handleScoreToggle);
    DOM.clearScoreBtn.addEventListener('click', clearExactScore);

    DOM.stepperHomeMinus.addEventListener('click', () => {
      if (state.guessHome > 0) {
        state.guessHome--;
        updateScoreDisplay();
      }
    });
    DOM.stepperHomePlus.addEventListener('click', () => {
      if (state.guessHome < 9) {
        state.guessHome++;
        updateScoreDisplay();
      }
    });

    DOM.stepperAwayMinus.addEventListener('click', () => {
      if (state.guessAway > 0) {
        state.guessAway--;
        updateScoreDisplay();
      }
    });
    DOM.stepperAwayPlus.addEventListener('click', () => {
      if (state.guessAway < 9) {
        state.guessAway++;
        updateScoreDisplay();
      }
    });

    // Reveal & Advance
    DOM.revealBtn.addEventListener('click', revealRound);
    DOM.nextRoundBtn.addEventListener('click', advanceNextRound);

    // End Actions
    DOM.replayBtn.addEventListener('click', startNewGame);
    DOM.homeBtn.addEventListener('click', () => {
      updateStartScreenBestScore();
      showScreen(DOM.startScreen);
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Avoid firing if focus is inside an input (none currently, but good practice)
      if (e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') return;

      const key = e.key.toUpperCase();

      // In Game Screen
      if (DOM.gameScreen.classList.contains('active')) {
        if (!state.isRoundRevealed) {
          if (key === '1') {
            e.preventDefault();
            handlePick('H');
          } else if (key === 'X') {
            e.preventDefault();
            handlePick('D');
          } else if (key === '2') {
            e.preventDefault();
            handlePick('A');
          } else if (e.key === 'Enter' || e.key === ' ') {
            if (state.selectedPick) {
              e.preventDefault();
              revealRound();
            }
          }
        } else {
          // Post reveal: advance
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            advanceNextRound();
          }
        }
      } else if (DOM.startScreen.classList.contains('active')) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startNewGame();
        }
      } else if (DOM.endScreen.classList.contains('active')) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startNewGame();
        }
      }
    });
  }

  // --- Initialize App ---
  document.addEventListener('DOMContentLoaded', () => {
    initStartScreen();
    setupEvents();
  });

})();
