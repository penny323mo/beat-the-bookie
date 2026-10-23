/**
 * 你估得贏莊家嗎？ (Beat the Bookie v2) - Game Logic
 * Pure vanilla JavaScript. Zero external dependencies, offline file:// safe.
 * Features:
 * - 8 Competitions (EPL, La Liga, Serie A, Bundesliga, Ligue 1, UCL, UEL, UECL)
 * - 5 Seasons (2021/22 - 2025/26)
 * - 1X2 & Asian Handicap (AH) betting modes
 * - Opening vs Closing odds with movement arrows and percentage change
 * - Lean lazy-loading via dynamic <script> tags (zero fetch/XHR)
 * - AI opponent that backs the favourite
 * - Margin-removed fair implied probability
 * - Exact score bonus (+20 units)
 * - LocalStorage best score persistence
 * - Keyboard shortcuts (1, X, 2, Space, Enter)
 * - All UI in authentic Cantonese (廣東話)
 */

(function () {
  'use strict';

  // --- Visual Configuration & Crest Generation ---
  // Palette for popular clubs; other clubs get a deterministic vibrant palette based on name hash
  const CLUB_PALETTES = {
    // EPL
    'Arsenal': { primary: '#ef0107', secondary: '#ffffff' },
    'Aston Villa': { primary: '#95bfe5', secondary: '#670e36' },
    'Chelsea': { primary: '#034694', secondary: '#ffffff' },
    'Liverpool': { primary: '#c8102e', secondary: '#00b2a9' },
    'Man City': { primary: '#6cabdd', secondary: '#1c2c5b' },
    'Manchester City': { primary: '#6cabdd', secondary: '#1c2c5b' },
    'Man United': { primary: '#da291c', secondary: '#fbe122' },
    'Manchester Utd': { primary: '#da291c', secondary: '#fbe122' },
    'Newcastle': { primary: '#241f20', secondary: '#ffffff' },
    'Tottenham': { primary: '#132257', secondary: '#ffffff' },
    // La Liga
    'Real Madrid': { primary: '#ffffff', secondary: '#dab042' },
    'Barcelona': { primary: '#a50044', secondary: '#004d98' },
    'Ath Madrid': { primary: '#cb3524', secondary: '#272e61' },
    'Atl. Madrid': { primary: '#cb3524', secondary: '#272e61' },
    'Ath Bilbao': { primary: '#ee2524', secondary: '#1b1b1b' },
    'Sociedad': { primary: '#0067b1', secondary: '#ffffff' },
    'Real Sociedad': { primary: '#0067b1', secondary: '#ffffff' },
    'Villarreal': { primary: '#ffd200', secondary: '#003865' },
    'Betis': { primary: '#00954c', secondary: '#ffffff' },
    'Sevilla': { primary: '#d40f1d', secondary: '#ffffff' },
    // Serie A
    'AC Milan': { primary: '#fb090b', secondary: '#000000' },
    'Milan': { primary: '#fb090b', secondary: '#000000' },
    'Inter': { primary: '#010e80', secondary: '#000000' },
    'Juventus': { primary: '#ffffff', secondary: '#000000' },
    'Roma': { primary: '#8e1f2f', secondary: '#f0bc42' },
    'AS Roma': { primary: '#8e1f2f', secondary: '#f0bc42' },
    'Napoli': { primary: '#12a0d7', secondary: '#ffffff' },
    // Bundesliga
    'Bayern Munich': { primary: '#dc052d', secondary: '#0066b2' },
    'Dortmund': { primary: '#fde100', secondary: '#000000' },
    'Leverkusen': { primary: '#e32221', secondary: '#000000' },
    'Bayer Leverkusen': { primary: '#e32221', secondary: '#000000' },
    'RB Leipzig': { primary: '#ffffff', secondary: '#dd0741' },
    // Ligue 1
    'PSG': { primary: '#004170', secondary: '#da291c' },
    'Paris SG': { primary: '#004170', secondary: '#da291c' },
    'Marseille': { primary: '#2faee0', secondary: '#ffffff' },
    'Monaco': { primary: '#e51b24', secondary: '#ffffff' },
    'Lyon': { primary: '#1d428a', secondary: '#da291c' }
  };

  function getDeterministicColors(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash) % 360;
    const h2 = (h1 + 45) % 360;
    return {
      primary: `hsl(${h1}, 70%, 45%)`,
      secondary: `hsl(${h2}, 85%, 65%)`
    };
  }

  function getTeamColors(teamName, enName) {
    if (enName && CLUB_PALETTES[enName]) {
      return CLUB_PALETTES[enName];
    }
    if (teamName && CLUB_PALETTES[teamName]) {
      return CLUB_PALETTES[teamName];
    }
    return getDeterministicColors(enName || teamName);
  }

  function sanitizeKey(str) {
    return String(str).replace(/[^a-zA-Z0-9]/g, '_');
  }

  function createTeamCrestSVG(teamName, enName) {
    const colors = getTeamColors(teamName, enName);
    const idKey = sanitizeKey(enName || teamName);
    const initials = (enName || teamName).substring(0, 3).toUpperCase();
    const c1 = colors.primary;
    const c2 = colors.secondary;

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
          <circle cx="24" cy="24" r="14" fill="rgba(10, 25, 15, 0.65)" stroke="#ffd700" stroke-width="1.2"/>
          <text x="24" y="28" text-anchor="middle" font-size="9" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, sans-serif" letter-spacing="0.5">${initials}</text>
        </g>
      </svg>
    `;
  }

  // --- Odds & Margin Mathematics ---
  function calculateOddsMath(h, d, a) {
    if (!h || !d || !a || h <= 0 || d <= 0 || a <= 0) {
      return { marginPct: 0, pH: 33.3, pD: 33.3, pA: 33.4, fav: 'H', minOdds: 0 };
    }
    const rH = 1 / h;
    const rD = 1 / d;
    const rA = 1 / a;
    const overround = rH + rD + rA;
    const marginPct = (overround - 1) * 100;

    const pH_raw = (rH / overround) * 100;
    const pD_raw = (rD / overround) * 100;

    const pH = Math.round(pH_raw * 10) / 10;
    const pD = Math.round(pD_raw * 10) / 10;
    const pA = Math.round((100 - pH - pD) * 10) / 10;

    const minOdds = Math.min(h, d, a);
    let fav = 'H';
    if (h === minOdds) fav = 'H';
    else if (a === minOdds) fav = 'A';
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

  // Format Asian Handicap Line for Display (e.g. -0.75 -> "讓半一 (-0.75)", 0 -> "平手 (0)")
  function formatAHLine(line) {
    if (line === 0) return '平手 (0)';
    const sign = line > 0 ? '+' : '';
    let cantoneseTerm = '';
    const abs = Math.abs(line);
    if (abs === 0.25) cantoneseTerm = '平手/半球';
    else if (abs === 0.5) cantoneseTerm = '半球';
    else if (abs === 0.75) cantoneseTerm = '半球/一球';
    else if (abs === 1.0) cantoneseTerm = '一球';
    else if (abs === 1.25) cantoneseTerm = '一球/球半';
    else if (abs === 1.5) cantoneseTerm = '球半';
    else if (abs === 1.75) cantoneseTerm = '球半/兩球';
    else if (abs === 2.0) cantoneseTerm = '兩球';
    else if (abs === 2.25) cantoneseTerm = '兩球/兩球半';
    else if (abs === 2.5) cantoneseTerm = '兩球半';
    else cantoneseTerm = `${abs}球`;

    const prefix = line > 0 ? '受讓' : '讓';
    return `${prefix}${cantoneseTerm} (${sign}${line})`;
  }

  // --- LocalStorage Best Score Handling ---
  const STORAGE_KEY = 'btb_best_v2';

  function getBestScore(startingBankroll) {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      if (val !== null) {
        const num = parseFloat(val);
        const threshold = Number.isFinite(startingBankroll)
          ? startingBankroll
          : (typeof state !== 'undefined' && Number.isFinite(state.startingBankroll) ? state.startingBankroll : 100);
        if (!isNaN(num)) {
          if (num > threshold) {
            return num;
          } else {
            // Treat stored scores <= startingBankroll as empty and purge stale non-profitable record
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
            return null;
          }
        }
      }
    } catch (e) {
      // Graceful fallback for file:// or private sandbox
    }
    return null;
  }

  function saveBestScore(score, startingBankroll = 100) {
    try {
      const cur = getBestScore(startingBankroll);
      // Only record a new high score if it is profitable (> startingBankroll) AND beats previous best
      if (score > startingBankroll && (cur === null || score > cur)) {
        localStorage.setItem(STORAGE_KEY, score.toFixed(1));
        return true;
      }
    } catch (e) {
      // Graceful fallback
    }
    return false;
  }

  // --- Number & Utility Formatting ---
  function formatNum(val) {
    const r = Math.round(val * 10) / 10;
    return r.toFixed(1);
  }

  function formatPL(val) {
    const r = Math.round(val * 10) / 10;
    if (r > 0) return `+${r.toFixed(1)}`;
    return r.toFixed(1);
  }

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

  // --- Lazy Loading Competition Data Files via <script> tags ---
  const scriptLoadPromises = new Map();

  function loadCompetitionData(compId) {
    if (window.BTB_DATA && window.BTB_DATA[compId]) {
      return Promise.resolve(window.BTB_DATA[compId]);
    }
    if (scriptLoadPromises.has(compId)) {
      return scriptLoadPromises.get(compId);
    }

    const p = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `data/${compId}.js`;
      script.async = false;

      const timeoutId = setTimeout(() => {
        scriptLoadPromises.delete(compId);
        if (script.parentNode) script.parentNode.removeChild(script);
        reject(new Error(`逾時未能載入 data/${compId}.js`));
      }, 10000);

      script.onload = () => {
        clearTimeout(timeoutId);
        if (window.BTB_DATA && window.BTB_DATA[compId]) {
          resolve(window.BTB_DATA[compId]);
        } else {
          scriptLoadPromises.delete(compId);
          if (script.parentNode) script.parentNode.removeChild(script);
          reject(new Error(`Data for ${compId} not found after script load.`));
        }
      };

      script.onerror = () => {
        clearTimeout(timeoutId);
        scriptLoadPromises.delete(compId);
        if (script.parentNode) script.parentNode.removeChild(script);
        reject(new Error(`Failed to load data/${compId}.js`));
      };

      document.head.appendChild(script);
    });

    scriptLoadPromises.set(compId, p);
    return p;
  }

  // Ensure all selected competitions are loaded
  function loadSelectedCompetitions(compIds) {
    return Promise.all(compIds.map(loadCompetitionData));
  }

  // --- Game State ---
  const state = {
    // Setup Options
    selectedComps: new Set(['epl', 'laliga', 'seriea', 'bundesliga', 'ligue1', 'ucl', 'uel', 'uecl']),
    selectedSeasons: new Set(['2025/26', '2024/25', '2023/24', '2022/23', '2021/22']),
    betMode: '1x2',          // '1x2' | 'ah'
    oddsType: 'closing',     // 'closing' | 'opening'
    roundsCount: 10,
    stake: 10,
    startingBankroll: 100.0,
    selectedTeam: '',        // empty = all
    dateFrom: '',            // YYYY-MM-DD
    dateTo: '',              // YYYY-MM-DD

    // Live Available Match Count Pool
    availablePoolCount: 0,

    // Current Game Session
    sessionMatches: [],
    unusedPool: [],
    rerollCount: 0,
    currentRoundIdx: 0,
    playerBankroll: 100.0,
    baselineBankroll: 100.0,
    isRoundRevealed: false,
    isAdvancing: false,
    endScreenOpenedAt: 0,

    // Current Round Selection
    selectedPick: null,      // 'H' | 'D' | 'A' for 1X2, or 'AH_H' | 'AH_A' for AH
    exactScoreActive: false,
    guessHome: null,
    guessAway: null,
    sessionRecap: []
  };

  // --- DOM Elements Cache ---
  let DOM = {};

  function initDOMElements() {
    DOM = {
      // Screens
      startScreen: document.getElementById('start-screen'),
      gameScreen: document.getElementById('game-screen'),
      endScreen: document.getElementById('end-screen'),

      // Start Screen Options
      compChipsContainer: document.getElementById('comp-chips-container'),
      seasonChipsContainer: document.getElementById('season-chips-container'),
      btnCompAll: document.getElementById('btn-comp-all'),
      btnCompLeagues: document.getElementById('btn-comp-leagues'),
      btnCompCups: document.getElementById('btn-comp-cups'),
      btnSeasonToggle: document.getElementById('btn-season-toggle'),

      betModeControl: document.getElementById('bet-mode-control'),
      ahModeNote: document.getElementById('ah-mode-note'),
      oddsTypeControl: document.getElementById('odds-type-control'),
      cupOddsNote: document.getElementById('cup-odds-note'),

      roundsPresetContainer: document.getElementById('rounds-preset-container'),
      customRoundsWrap: document.getElementById('custom-rounds-wrap'),
      customRoundsInput: document.getElementById('custom-rounds-input'),

      bankrollPresetContainer: document.getElementById('bankroll-preset-container'),
      customBankrollWrap: document.getElementById('custom-bankroll-wrap'),
      customBankrollInput: document.getElementById('custom-bankroll-input'),

      stakePresetContainer: document.getElementById('stake-preset-container'),
      customStakeWrap: document.getElementById('custom-stake-wrap'),
      customStakeInput: document.getElementById('custom-stake-input'),

      // Advanced Filter
      advancedFilterDetails: document.getElementById('advanced-filter-details'),
      teamSearchInput: document.getElementById('team-search-input'),
      teamSelect: document.getElementById('team-select'),
      dateFromInput: document.getElementById('date-from'),
      dateToInput: document.getElementById('date-to'),
      btnClearAdvanced: document.getElementById('btn-clear-advanced'),

      // Live Pool Count & Warnings
      livePoolBanner: document.getElementById('live-pool-banner'),
      livePoolNum: document.getElementById('live-pool-num'),
      poolWarningBox: document.getElementById('pool-warning-box'),
      poolWarningText: document.getElementById('pool-warning-text'),
      bestScoreDisplay: document.getElementById('best-score-display'),
      startGameBtn: document.getElementById('start-game-btn'),
      startBtnText: document.getElementById('start-btn-text'),
      startErrorBanner: document.getElementById('start-error-banner'),

      // Game Screen HUD
      hudRoundText: document.getElementById('hud-round-text'),
      hudCompBadge: document.getElementById('hud-comp-badge'),
      hudSeason: document.getElementById('hud-season'),
      hudDate: document.getElementById('hud-date'),
      hudModeBadge: document.getElementById('hud-mode-badge'),
      playerBankrollDisplay: document.getElementById('player-bankroll-display'),
      playerChangeDisplay: document.getElementById('player-change-display'),
      baselineBankrollDisplay: document.getElementById('baseline-bankroll-display'),
      baselineChangeDisplay: document.getElementById('baseline-change-display'),

      // Arena Reroll Control
      rerollBtn: document.getElementById('reroll-btn'),
      rerollCountPill: document.getElementById('reroll-count-pill'),

      // Teams & Center Score
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

      // Market & Movement Analysis
      marginIndicatorBox: document.getElementById('margin-indicator-box'),
      marginValueDisplay: document.getElementById('margin-value-display'),
      matchStakeDisplay: document.getElementById('match-stake-display'),

      oddsMovement1x2: document.getElementById('odds-movement-1x2'),
      movementItemH: document.getElementById('movement-item-h'),
      movFlowH: document.getElementById('mov-flow-h'),
      movBadgeH: document.getElementById('mov-badge-h'),
      movFlowD: document.getElementById('mov-flow-d'),
      movBadgeD: document.getElementById('mov-badge-d'),
      movFlowA: document.getElementById('mov-flow-a'),
      movBadgeA: document.getElementById('mov-badge-a'),

      oddsMovementAh: document.getElementById('odds-movement-ah'),
      ahMovementFlowText: document.getElementById('ah-movement-flow-text'),
      ahLineShiftBadge: document.getElementById('ah-line-shift-badge'),
      cupOddsBadge: document.getElementById('cup-odds-badge'),

      // Betting Boards
      oddsBoard1x2: document.getElementById('odds-board-1x2'),
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

      oddsBoardAh: document.getElementById('odds-board-ah'),
      btnPickAhH: document.getElementById('btn-pick-ah-h'),
      btnPickAhA: document.getElementById('btn-pick-ah-a'),
      ahLabelH: document.getElementById('ah-label-h'),
      ahLabelA: document.getElementById('ah-label-a'),
      ahLineH: document.getElementById('ah-line-h'),
      ahLineA: document.getElementById('ah-line-a'),
      ahOddsH: document.getElementById('ah-odds-h'),
      ahOddsA: document.getElementById('ah-odds-a'),
      favBadgeAhH: document.getElementById('fav-badge-ah-h'),
      favBadgeAhA: document.getElementById('fav-badge-ah-a'),

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

      // Reveal & Next Round
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
      endTitleText: document.getElementById('end-title-text'),
      endTrophyBadge: document.getElementById('end-trophy-badge'),
      verdictBanner: document.getElementById('verdict-banner'),
      verdictText: document.getElementById('verdict-text'),
      verdictSubtitle: document.getElementById('verdict-subtitle'),
      bookiePnlBanner: document.getElementById('bookie-pnl-banner'),
      bookiePnlText: document.getElementById('bookie-pnl-text'),
      verdictDetail: document.getElementById('verdict-detail'),
      statFinalBankroll: document.getElementById('stat-final-bankroll'),
      statNetPl: document.getElementById('stat-net-pl'),
      statBaselineBankroll: document.getElementById('stat-baseline-bankroll'),
      statBaselinePl: document.getElementById('stat-baseline-pl'),
      statHitRate: document.getElementById('stat-hit-rate'),
      statHitPct: document.getElementById('stat-hit-pct'),
      statScoreHits: document.getElementById('stat-score-hits'),
      statScoreBonusSub: document.getElementById('stat-score-bonus-sub'),
      statRoi: document.getElementById('stat-roi'),
      statRoiSub: document.getElementById('stat-roi-sub'),
      statRerollCount: document.getElementById('stat-reroll-count'),
      statRerollSub: document.getElementById('stat-reroll-sub'),
      endBestScore: document.getElementById('end-best-score'),
      endRecordSub: document.getElementById('end-record-sub'),
      recapSectionTitle: document.getElementById('recap-section-title'),
      recapListContainer: document.getElementById('recap-list-container'),
      replayBtn: document.getElementById('replay-btn'),
      homeBtn: document.getElementById('home-btn')
    };
  }

  // --- Screen Switching ---
  function showScreen(screenEl) {
    [DOM.startScreen, DOM.gameScreen, DOM.endScreen].forEach(el => {
      el.classList.remove('active');
    });
    screenEl.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (screenEl === DOM.startScreen) {
      if (DOM.startGameBtn) DOM.startGameBtn.focus();
    } else if (screenEl === DOM.gameScreen) {
      if (DOM.btnPickH) DOM.btnPickH.focus();
    } else if (screenEl === DOM.endScreen) {
      if (DOM.verdictText) DOM.verdictText.focus();
    }
  }

  // --- Live Pool Count Calculation ---
  function updateLivePoolCount() {
    if (!window.BTB_META) return;

    const isAdvancedFilterActive = !!(state.selectedTeam || state.dateFrom || state.dateTo);

    // If no advanced filters are active, calculate instantaneously from BTB_META.counts!
    if (!isAdvancedFilterActive) {
      let count = 0;
      const metaCounts = window.BTB_META.counts || {};
      state.selectedComps.forEach(compId => {
        const compCounts = metaCounts[compId];
        if (!compCounts) return;
        window.BTB_META.seasons.forEach((seasonStr, sIdx) => {
          if (state.selectedSeasons.has(seasonStr)) {
            const seasonInfo = compCounts[sIdx];
            if (seasonInfo) {
              if (state.betMode === 'ah') {
                if (state.oddsType === 'opening') {
                  count += seasonInfo.openAH || 0;
                } else {
                  count += seasonInfo.closeAH || 0;
                }
              } else {
                if (state.oddsType === 'opening') {
                  count += seasonInfo.open1x2 || 0;
                } else {
                  count += Number(seasonInfo.close1x2) || 0;
                }
              }
            }
          }
        });
      });

      applyPoolCountUI(count);
      return;
    }

    // If advanced filter is active, we load selected competitions to filter accurately
    const compsToLoad = Array.from(state.selectedComps);
    loadSelectedCompetitions(compsToLoad).then(() => {
      let count = 0;
      const fromInt = state.dateFrom ? parseInt(state.dateFrom.replace(/-/g, ''), 10) : 0;
      const toInt = state.dateTo ? parseInt(state.dateTo.replace(/-/g, ''), 10) : 99999999;

      compsToLoad.forEach(compId => {
        const compData = window.BTB_DATA && window.BTB_DATA[compId];
        if (!compData || !Array.isArray(compData.m)) return;

        const teams = compData.teams;
        compData.m.forEach(m => {
          const sIdx = m[3];
          const seasonStr = window.BTB_META.seasons[sIdx];
          if (!state.selectedSeasons.has(seasonStr)) return;

          // Filter by required odds based on betMode and oddsType
          if (state.betMode === 'ah') {
            if (state.oddsType === 'opening') {
              const hasOpenAH = m[17] !== null && m[18] !== null && m[19] !== null;
              if (!hasOpenAH) return;
            } else {
              const hasCloseAH = m[21] !== null && m[22] !== null && m[23] !== null;
              if (!hasCloseAH) return;
            }
          } else {
            if (state.oddsType === 'opening') {
              const hasOpen1X2 = m[9] !== null && m[10] !== null && m[11] !== null;
              if (!hasOpen1X2) return;
            } else {
              const hasClose1X2 = m[13] !== null && m[14] !== null && m[15] !== null;
              if (!hasClose1X2) return;
            }
          }

          // Date check
          const dateInt = m[2];
          if (dateInt < fromInt || dateInt > toInt) return;

          // Team check
          if (state.selectedTeam) {
            const hTeam = teams[m[0]];
            const aTeam = teams[m[1]];
            const hMatch = hTeam && (hTeam.zh === state.selectedTeam || hTeam.en === state.selectedTeam);
            const aMatch = aTeam && (aTeam.zh === state.selectedTeam || aTeam.en === state.selectedTeam);
            if (!hMatch && !aMatch) return;
          }

          count++;
        });
      });

      applyPoolCountUI(count);
    }).catch(err => {
      console.error('Error loading comp data for live pool count:', err);
    });
  }

  function applyPoolCountUI(count) {
    state.availablePoolCount = count;
    DOM.livePoolNum.textContent = count.toLocaleString('zh-HK');

    let canStart = true;
    let reason = '';

    if (state.selectedComps.size === 0) {
      canStart = false;
      reason = '請至少選擇一項賽事！';
    } else if (state.selectedSeasons.size === 0) {
      canStart = false;
      reason = '請至少選擇一個賽季！';
    } else if (count === 0) {
      canStart = false;
      if (state.betMode === 'ah') {
        reason = '所選賽事或賽季無符合之亞洲盤比賽（歐洲賽不設亞洲盤），請勾選聯賽！';
      } else if (state.oddsType === 'opening') {
        reason = '所選賽事或賽季無初盤比賽（歐洲賽無初盤賠率），請勾選聯賽或切換至終盤！';
      } else {
        reason = '所選條件下無符合比賽，請放寬賽事或篩選條件！';
      }
    } else if (count < state.roundsCount) {
      canStart = false;
      reason = `可用比賽唔夠（得 ${count} 場，需要 ${state.roundsCount} 場），請挑選更多賽季或減少局數！`;
    }

    if (canStart) {
      DOM.poolWarningBox.style.display = 'none';
      DOM.startGameBtn.disabled = false;
      DOM.startBtnText.textContent = `開波！（共 ${state.roundsCount} 場）`;
    } else {
      DOM.poolWarningBox.style.display = 'flex';
      DOM.poolWarningText.textContent = reason;
      DOM.startGameBtn.disabled = true;
      DOM.startBtnText.textContent = '條件不足（無法開波）';
    }
  }

  function refreshCupOddsNote() {
    if (!DOM.cupOddsNote) return;
    const hasCups = state.selectedComps.has('ucl') || state.selectedComps.has('uel') || state.selectedComps.has('uecl');
    if (!hasCups) {
      DOM.cupOddsNote.style.display = 'none';
      return;
    }
    if (state.betMode === 'ah') {
      DOM.cupOddsNote.textContent = '💡 歐洲賽事（歐聯/歐霸/歐協聯）不設亞洲讓球盤，亞洲盤模式下將不包含歐洲賽。';
      DOM.cupOddsNote.style.display = 'block';
    } else if (state.oddsType === 'opening') {
      DOM.cupOddsNote.textContent = '💡 歐洲賽事（歐聯/歐霸/歐協聯）無初盤賠率，初盤模式下將不包含歐洲賽。';
      DOM.cupOddsNote.style.display = 'block';
    } else {
      DOM.cupOddsNote.textContent = '💡 歐洲賽事（歐聯/歐霸/歐協聯）只有終盤 1X2 賠率，不設初盤及亞洲讓球盤。';
      DOM.cupOddsNote.style.display = 'block';
    }
  }

  // --- Populate Team Search & Dropdown from BTB_META ---
  function populateTeamDropdown() {
    if (!window.BTB_META || !Array.isArray(window.BTB_META.teams)) return;
    const filterText = (DOM.teamSearchInput.value || '').trim().toLowerCase();
    const currentVal = DOM.teamSelect.value;

    DOM.teamSelect.innerHTML = '<option value="">全部球隊（唔限）</option>';

    // Filter teams that belong to currently selected competitions
    const activeTeams = window.BTB_META.teams.filter(t => {
      const inComps = t.comps.some(c => state.selectedComps.has(c));
      if (!inComps) return false;
      if (filterText) {
        return t.zh.toLowerCase().includes(filterText) || t.en.toLowerCase().includes(filterText);
      }
      return true;
    });

    activeTeams.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.zh;
      opt.textContent = `${t.zh} (${t.en})`;
      DOM.teamSelect.appendChild(opt);
    });

    if (currentVal && activeTeams.some(t => t.zh === currentVal)) {
      DOM.teamSelect.value = currentVal;
    } else if (state.selectedTeam && activeTeams.some(t => t.zh === state.selectedTeam)) {
      DOM.teamSelect.value = state.selectedTeam;
    } else {
      state.selectedTeam = '';
    }
  }

  // --- Start Screen Setup & Listeners ---
  function updateStartScreenBestScore() {
    const threshold = (typeof state !== 'undefined' && Number.isFinite(state.startingBankroll)) ? state.startingBankroll : 100;
    const best = getBestScore(threshold);
    if (best !== null) {
      DOM.bestScoreDisplay.textContent = `${formatNum(best)} 注`;
    } else {
      DOM.bestScoreDisplay.textContent = '暫無紀錄（挑戰開創首個紀錄！）';
    }
  }

  function initStartScreen() {
    updateStartScreenBestScore();
    populateTeamDropdown();

    // 1. Competition chips toggle
    const compChips = DOM.compChipsContainer.querySelectorAll('.chip-btn');
    compChips.forEach(btn => {
      btn.addEventListener('click', () => {
        const comp = btn.dataset.comp;
        if (state.selectedComps.has(comp)) {
          state.selectedComps.delete(comp);
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        } else {
          state.selectedComps.add(comp);
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
          // Prefetch in background
          loadCompetitionData(comp);
        }
        populateTeamDropdown();
        refreshCupOddsNote();
        updateLivePoolCount();
      });
    });

    // Competition quick buttons
    DOM.btnCompAll.addEventListener('click', () => {
      const allComps = ['epl', 'laliga', 'seriea', 'bundesliga', 'ligue1', 'ucl', 'uel', 'uecl'];
      allComps.forEach(c => state.selectedComps.add(c));
      compChips.forEach(b => {
        b.classList.add('active');
        b.setAttribute('aria-pressed', 'true');
      });
      populateTeamDropdown();
      refreshCupOddsNote();
      updateLivePoolCount();
    });

    DOM.btnCompLeagues.addEventListener('click', () => {
      const leagues = ['epl', 'laliga', 'seriea', 'bundesliga', 'ligue1'];
      state.selectedComps.clear();
      leagues.forEach(c => state.selectedComps.add(c));
      compChips.forEach(b => {
        const isL = leagues.includes(b.dataset.comp);
        b.classList.toggle('active', isL);
        b.setAttribute('aria-pressed', isL ? 'true' : 'false');
      });
      populateTeamDropdown();
      refreshCupOddsNote();
      updateLivePoolCount();
    });

    DOM.btnCompCups.addEventListener('click', () => {
      const cups = ['ucl', 'uel', 'uecl'];
      state.selectedComps.clear();
      cups.forEach(c => state.selectedComps.add(c));
      compChips.forEach(b => {
        const isC = cups.includes(b.dataset.comp);
        b.classList.toggle('active', isC);
        b.setAttribute('aria-pressed', isC ? 'true' : 'false');
      });
      populateTeamDropdown();
      refreshCupOddsNote();
      updateLivePoolCount();
    });

    // 2. Season chips toggle
    const seasonChips = DOM.seasonChipsContainer.querySelectorAll('.chip-btn');
    seasonChips.forEach(btn => {
      btn.addEventListener('click', () => {
        const s = btn.dataset.season;
        if (state.selectedSeasons.has(s)) {
          state.selectedSeasons.delete(s);
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        } else {
          state.selectedSeasons.add(s);
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
        }
        updateLivePoolCount();
      });
    });

    DOM.btnSeasonToggle.addEventListener('click', () => {
      const allSeasons = ['2025/26', '2024/25', '2023/24', '2022/23', '2021/22'];
      if (state.selectedSeasons.size === allSeasons.length) {
        state.selectedSeasons.clear();
        seasonChips.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
      } else {
        allSeasons.forEach(s => state.selectedSeasons.add(s));
        seasonChips.forEach(b => {
          b.classList.add('active');
          b.setAttribute('aria-pressed', 'true');
        });
      }
      updateLivePoolCount();
    });

    // 3. Bet mode segmented control
    const modeBtns = DOM.betModeControl.querySelectorAll('.segment-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        state.betMode = btn.dataset.mode;

        DOM.ahModeNote.style.display = state.betMode === 'ah' ? 'block' : 'none';
        refreshCupOddsNote();
        updateLivePoolCount();
      });
    });

    // 4. Odds type segmented control
    const oddsBtns = DOM.oddsTypeControl.querySelectorAll('.segment-btn');
    oddsBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        oddsBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        state.oddsType = btn.dataset.odds;

        refreshCupOddsNote();
        updateLivePoolCount();
      });
    });

    // 5. Rounds presets & custom input
    const roundBtns = DOM.roundsPresetContainer.querySelectorAll('.chip-btn');
    roundBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        roundBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        const rVal = btn.dataset.rounds;
        if (rVal === 'custom') {
          DOM.customRoundsWrap.style.display = 'flex';
          state.roundsCount = Math.max(1, parseInt(DOM.customRoundsInput.value, 10) || 10);
        } else {
          DOM.customRoundsWrap.style.display = 'none';
          state.roundsCount = parseInt(rVal, 10);
        }
        updateLivePoolCount();
      });
    });

    DOM.customRoundsInput.addEventListener('input', () => {
      state.roundsCount = Math.max(1, parseInt(DOM.customRoundsInput.value, 10) || 1);
      updateLivePoolCount();
    });

    // 6. Starting Bankroll presets & custom input
    if (DOM.bankrollPresetContainer) {
      const bankrollBtns = DOM.bankrollPresetContainer.querySelectorAll('.chip-btn');
      bankrollBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          bankrollBtns.forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-checked', 'false');
          });
          btn.classList.add('active');
          btn.setAttribute('aria-checked', 'true');
          const bVal = btn.dataset.bankroll;
          if (bVal === 'custom') {
            DOM.customBankrollWrap.style.display = 'flex';
            state.startingBankroll = Math.max(1, parseFloat(DOM.customBankrollInput.value) || 100);
          } else {
            DOM.customBankrollWrap.style.display = 'none';
            state.startingBankroll = parseFloat(bVal);
          }
          updateStartScreenBestScore();
        });
      });

      DOM.customBankrollInput.addEventListener('input', () => {
        state.startingBankroll = Math.max(1, parseFloat(DOM.customBankrollInput.value) || 1);
        updateStartScreenBestScore();
      });
    }

    // 7. Stake presets & custom input
    const stakeBtns = DOM.stakePresetContainer.querySelectorAll('.chip-btn');
    stakeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        stakeBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        const sVal = btn.dataset.stake;
        if (sVal === 'custom') {
          DOM.customStakeWrap.style.display = 'flex';
          state.stake = Math.max(1, parseInt(DOM.customStakeInput.value, 10) || 10);
        } else {
          DOM.customStakeWrap.style.display = 'none';
          state.stake = parseInt(sVal, 10);
        }
      });
    });

    DOM.customStakeInput.addEventListener('input', () => {
      state.stake = Math.max(1, parseInt(DOM.customStakeInput.value, 10) || 1);
    });

    // 7. Advanced filter listeners
    DOM.teamSearchInput.addEventListener('input', () => {
      populateTeamDropdown();
    });

    DOM.teamSelect.addEventListener('change', () => {
      state.selectedTeam = DOM.teamSelect.value;
      updateLivePoolCount();
    });

    DOM.dateFromInput.addEventListener('change', () => {
      state.dateFrom = DOM.dateFromInput.value;
      updateLivePoolCount();
    });

    DOM.dateToInput.addEventListener('change', () => {
      state.dateTo = DOM.dateToInput.value;
      updateLivePoolCount();
    });

    DOM.btnClearAdvanced.addEventListener('click', () => {
      DOM.teamSearchInput.value = '';
      DOM.teamSelect.value = '';
      DOM.dateFromInput.value = '';
      DOM.dateToInput.value = '';
      state.selectedTeam = '';
      state.dateFrom = '';
      state.dateTo = '';
      populateTeamDropdown();
      updateLivePoolCount();
    });

    // 8. Start game CTA
    DOM.startGameBtn.addEventListener('click', startNewGame);

    // Initial note & pool count calculation
    refreshCupOddsNote();
    updateLivePoolCount();
  }

  // --- Start Game & Match Pool Extraction ---
  function startNewGame() {
    if (DOM.startErrorBanner) {
      DOM.startErrorBanner.style.display = 'none';
      DOM.startErrorBanner.textContent = '';
    }

    const compsToLoad = Array.from(state.selectedComps);
    if (compsToLoad.length === 0) {
      alert('請先選擇至少一項賽事！');
      return;
    }

    DOM.startGameBtn.disabled = true;
    DOM.startBtnText.textContent = '載入比賽數據中...';

    loadSelectedCompetitions(compsToLoad).then(() => {
      const pool = [];
      const fromInt = state.dateFrom ? parseInt(state.dateFrom.replace(/-/g, ''), 10) : 0;
      const toInt = state.dateTo ? parseInt(state.dateTo.replace(/-/g, ''), 10) : 99999999;

      compsToLoad.forEach(compId => {
        const compData = window.BTB_DATA && window.BTB_DATA[compId];
        if (!compData || !Array.isArray(compData.m)) return;

        const compMeta = (window.BTB_META.competitions || []).find(c => c.id === compId) || { name: compId, fullName: compId };
        const teams = compData.teams;

        compData.m.forEach(m => {
          const sIdx = m[3];
          const seasonStr = window.BTB_META.seasons[sIdx];
          if (!state.selectedSeasons.has(seasonStr)) return;

          // AH or 1X2 odds requirement based on betMode and oddsType
          const hasOpenAH = m[17] !== null && m[18] !== null && m[19] !== null;
          const hasCloseAH = m[21] !== null && m[22] !== null && m[23] !== null;
          const hasOpen1X2 = m[9] !== null && m[10] !== null && m[11] !== null;
          const hasClose1X2 = m[13] !== null && m[14] !== null && m[15] !== null;

          if (state.betMode === 'ah') {
            if (state.oddsType === 'opening' && !hasOpenAH) return;
            if (state.oddsType === 'closing' && !hasCloseAH) return;
          } else {
            if (state.oddsType === 'opening' && !hasOpen1X2) return;
            if (state.oddsType === 'closing' && !hasClose1X2) return;
          }

          // Date check
          const dateInt = m[2];
          if (dateInt < fromInt || dateInt > toInt) return;

          // Team filter check
          const homeTeam = teams[m[0]];
          const awayTeam = teams[m[1]];
          if (state.selectedTeam) {
            const hMatch = homeTeam && (homeTeam.zh === state.selectedTeam || homeTeam.en === state.selectedTeam);
            const aMatch = awayTeam && (awayTeam.zh === state.selectedTeam || awayTeam.en === state.selectedTeam);
            if (!hMatch && !aMatch) return;
          }

          // Format Date YYYY-MM-DD
          const dStr = String(dateInt);
          const formattedDate = `${dStr.substring(0, 4)}-${dStr.substring(4, 6)}-${dStr.substring(6, 8)}`;

          pool.push({
            comp: compId,
            compName: compMeta.name,
            compFullName: compMeta.fullName,
            season: seasonStr,
            date: formattedDate,
            home: homeTeam,
            away: awayTeam,
            fthg: m[4],
            ftag: m[5],
            ftr: m[6],
            hthg: m[7],
            htag: m[8],
            // 1X2 Odds
            open1X2: m[9] ? { h: m[9], d: m[10], a: m[11], bk: m[12] } : null,
            close1X2: m[13] ? { h: m[13], d: m[14], a: m[15], bk: m[16] } : null,
            // AH Odds
            openAH: hasOpenAH ? { line: m[17], h: m[18], a: m[19], bk: m[20] } : null,
            closeAH: hasCloseAH ? { line: m[21], h: m[22], a: m[23], bk: m[24] } : null
          });
        });
      });

      if (pool.length < state.roundsCount) {
        DOM.startGameBtn.disabled = false;
        DOM.startBtnText.textContent = `開波！（共 ${state.roundsCount} 場）`;
        DOM.startErrorBanner.textContent = `篩選後可用比賽得 ${pool.length} 場，不足設定嘅 ${state.roundsCount} 場！請調整選項。`;
        DOM.startErrorBanner.style.display = 'block';
        return;
      }

      // Sample N distinct random matches and store remaining in unusedPool
      const shuffled = shuffleArray(pool);
      state.sessionMatches = shuffled.slice(0, state.roundsCount);
      state.unusedPool = shuffled.slice(state.roundsCount);
      state.rerollCount = 0;
      state.currentRoundIdx = 0;
      state.playerBankroll = state.startingBankroll;
      state.baselineBankroll = state.startingBankroll;
      state.sessionRecap = [];
      state.isAdvancing = false;

      showScreen(DOM.gameScreen);
      loadRound(state.currentRoundIdx);
    }).catch(err => {
      console.error('Failed to load competition data:', err);
      alert('載入賽事數據出錯，請確保 data/*.js 檔案存在。');
      DOM.startGameBtn.disabled = false;
      DOM.startBtnText.textContent = `開波！（共 ${state.roundsCount} 場）`;
    });
  }

  // --- Load and Render Round ---
  function loadRound(roundIdx) {
    const match = state.sessionMatches[roundIdx];

    state.isRoundRevealed = false;
    state.isAdvancing = false;
    state.selectedPick = null;
    state.exactScoreActive = false;
    state.guessHome = null;
    state.guessAway = null;

    // HUD Update
    DOM.hudRoundText.textContent = `第 ${roundIdx + 1} / ${state.roundsCount} 場`;
    DOM.hudCompBadge.textContent = match.compName;
    DOM.hudSeason.textContent = match.season;
    DOM.hudDate.textContent = match.date;

    const modeLabel = state.betMode === 'ah' ? '亞洲讓球盤' : '1X2';
    const oddsLabel = state.oddsType === 'opening' ? '初盤' : '終盤';
    DOM.hudModeBadge.textContent = `${modeLabel} · ${oddsLabel}`;

    DOM.playerBankrollDisplay.innerHTML = `${formatNum(state.playerBankroll)} <span class="unit">注</span>`;
    DOM.baselineBankrollDisplay.innerHTML = `${formatNum(state.baselineBankroll)} <span class="unit">注</span>`;
    DOM.playerChangeDisplay.textContent = '±0.0';
    DOM.playerChangeDisplay.className = 'bankroll-change';
    DOM.baselineChangeDisplay.textContent = '±0.0';
    DOM.baselineChangeDisplay.className = 'bankroll-change';

    // Reroll Button Update
    if (DOM.rerollCountPill) {
      DOM.rerollCountPill.textContent = `已換 ${state.rerollCount} 次`;
    }
    if (DOM.rerollBtn) {
      if (!state.unusedPool || state.unusedPool.length === 0) {
        DOM.rerollBtn.disabled = true;
        DOM.rerollBtn.title = '賽事池已無其他備用比賽';
      } else {
        DOM.rerollBtn.disabled = false;
        DOM.rerollBtn.title = '換另一場未用過的比賽 (快捷鍵 R)';
      }
    }

    // Teams Board
    DOM.homeCrest.innerHTML = createTeamCrestSVG(match.home.zh, match.home.en);
    DOM.homeTeamZh.textContent = match.home.zh;
    DOM.homeTeamEn.textContent = match.home.en;

    DOM.awayCrest.innerHTML = createTeamCrestSVG(match.away.zh, match.away.en);
    DOM.awayTeamZh.textContent = match.away.zh;
    DOM.awayTeamEn.textContent = match.away.en;

    // Score center: reset to VS badge
    DOM.vsBadge.style.display = 'block';
    DOM.revealedScoreBox.style.display = 'none';

    // Stake reminder
    DOM.matchStakeDisplay.textContent = `${state.stake} 注`;

    // Cup notification
    const isCup = match.comp === 'ucl' || match.comp === 'uel' || match.comp === 'uecl';
    DOM.cupOddsBadge.style.display = isCup ? 'block' : 'none';

    // --- Render Market Movement and Betting Boards ---
    if (state.betMode === '1x2') {
      DOM.oddsMovement1x2.style.display = 'flex';
      DOM.oddsMovementAh.style.display = 'none';
      DOM.oddsBoard1x2.style.display = 'grid';
      DOM.oddsBoardAh.style.display = 'none';
      DOM.marginIndicatorBox.style.display = 'flex';

      render1X2Board(match);
    } else {
      DOM.oddsMovement1x2.style.display = 'none';
      DOM.oddsMovementAh.style.display = 'flex';
      DOM.oddsBoard1x2.style.display = 'none';
      DOM.oddsBoardAh.style.display = 'grid';
      DOM.marginIndicatorBox.style.display = 'none';

      renderAHBoard(match);
    }

    // Reset Exact Score Panel
    DOM.exactScoreToggle.disabled = false;
    DOM.exactScoreToggle.checked = false;
    DOM.exactScoreSteppers.style.display = 'none';
    DOM.stepperHomeName.textContent = match.home.zh;
    DOM.stepperAwayName.textContent = match.away.zh;
    DOM.stepperHomeVal.textContent = '—';
    DOM.stepperAwayVal.textContent = '—';
    DOM.stepperHomeMinus.disabled = false;
    DOM.stepperHomePlus.disabled = false;
    DOM.stepperAwayMinus.disabled = false;
    DOM.stepperAwayPlus.disabled = false;
    DOM.clearScoreBtn.disabled = false;

    // Reset Reveal Actions
    DOM.revealBtn.style.display = 'flex';
    DOM.revealBtn.disabled = true;
    DOM.revealBtnText.textContent = state.betMode === 'ah' ? '請先選擇「主隊」或「客隊」讓球盤' : '請先選擇「主勝 / 和局 / 客勝」';
    DOM.roundResultCard.style.display = 'none';

    if (roundIdx === state.roundsCount - 1) {
      DOM.nextRoundBtn.innerHTML = '<span>查看最終戰報</span> <span class="btn-icon">🏆</span>';
    } else {
      DOM.nextRoundBtn.innerHTML = '<span>下一場</span> <span class="btn-icon">⏩</span>';
    }
  }

  // --- Render 1X2 Market & Movement ---
  function render1X2Board(match) {
    const activeOdds = (state.oddsType === 'opening') ? match.open1X2 : match.close1X2;
    if (!activeOdds || !activeOdds.h || !activeOdds.d || !activeOdds.a) {
      console.warn('activeOdds missing for 1X2 match:', match);
      DOM.marginValueDisplay.textContent = '無賠率';
      DOM.oddsValH.textContent = '—';
      DOM.oddsValD.textContent = '—';
      DOM.oddsValA.textContent = '—';
      DOM.probValH.textContent = '—';
      DOM.probValD.textContent = '—';
      DOM.probValA.textContent = '—';
      DOM.favBadgeH.innerHTML = '';
      DOM.favBadgeD.innerHTML = '';
      DOM.favBadgeA.innerHTML = '';
      [DOM.btnPickH, DOM.btnPickD, DOM.btnPickA].forEach(btn => {
        btn.classList.remove('selected');
        btn.disabled = true;
        btn.setAttribute('aria-pressed', 'false');
      });
      DOM.movFlowH.textContent = '無賠率';
      DOM.movBadgeH.textContent = '無數據';
      DOM.movBadgeH.className = 'mov-badge flat';
      DOM.movFlowD.textContent = '無賠率';
      DOM.movBadgeD.textContent = '無數據';
      DOM.movBadgeD.className = 'mov-badge flat';
      DOM.movFlowA.textContent = '無賠率';
      DOM.movBadgeA.textContent = '無數據';
      DOM.movBadgeA.className = 'mov-badge flat';
      return;
    }

    const math = calculateOddsMath(activeOdds.h, activeOdds.d, activeOdds.a);

    DOM.marginValueDisplay.textContent = `${math.marginPct.toFixed(1)}%`;

    DOM.oddsValH.textContent = activeOdds.h.toFixed(2);
    DOM.oddsValD.textContent = activeOdds.d.toFixed(2);
    DOM.oddsValA.textContent = activeOdds.a.toFixed(2);

    DOM.probValH.textContent = `${math.pH.toFixed(1)}%`;
    DOM.probValD.textContent = `${math.pD.toFixed(1)}%`;
    DOM.probValA.textContent = `${math.pA.toFixed(1)}%`;

    DOM.favBadgeH.innerHTML = math.fav === 'H' ? '<span class="fav-badge">莊家熱門 🔥</span>' : '';
    DOM.favBadgeD.innerHTML = math.fav === 'D' ? '<span class="fav-badge">莊家熱門 🔥</span>' : '';
    DOM.favBadgeA.innerHTML = math.fav === 'A' ? '<span class="fav-badge">莊家熱門 🔥</span>' : '';

    // Clear pick selection
    [DOM.btnPickH, DOM.btnPickD, DOM.btnPickA].forEach(btn => {
      btn.classList.remove('selected');
      btn.disabled = false;
      btn.setAttribute('aria-pressed', 'false');
    });

    // 1X2 Movement Display (Opening vs Closing)
    if (match.open1X2 && match.close1X2) {
      render1X2MovementItem(DOM.movFlowH, DOM.movBadgeH, match.open1X2.h, match.close1X2.h);
      render1X2MovementItem(DOM.movFlowD, DOM.movBadgeD, match.open1X2.d, match.close1X2.d);
      render1X2MovementItem(DOM.movFlowA, DOM.movBadgeA, match.open1X2.a, match.close1X2.a);
    } else {
      // Cup or missing opening odds
      DOM.movFlowH.textContent = `${activeOdds.h.toFixed(2)} (終盤)`;
      DOM.movBadgeH.textContent = '無初盤';
      DOM.movBadgeH.className = 'mov-badge flat';

      DOM.movFlowD.textContent = `${activeOdds.d.toFixed(2)} (終盤)`;
      DOM.movBadgeD.textContent = '無初盤';
      DOM.movBadgeD.className = 'mov-badge flat';

      DOM.movFlowA.textContent = `${activeOdds.a.toFixed(2)} (終盤)`;
      DOM.movBadgeA.textContent = '無初盤';
      DOM.movBadgeA.className = 'mov-badge flat';
    }
  }

  function render1X2MovementItem(flowEl, badgeEl, openVal, closeVal) {
    flowEl.textContent = `${openVal.toFixed(2)} ➔ ${closeVal.toFixed(2)}`;
    const diff = closeVal - openVal;
    const pct = (diff / openVal) * 100;
    if (Math.abs(pct) < 0.1) {
      badgeEl.textContent = '持平 0.0%';
      badgeEl.className = 'mov-badge flat';
    } else if (diff > 0) {
      badgeEl.textContent = `↑ 升 ${pct.toFixed(1)}%`;
      badgeEl.className = 'mov-badge rise';
    } else {
      badgeEl.textContent = `↓ 跌 ${Math.abs(pct).toFixed(1)}%`;
      badgeEl.className = 'mov-badge drop';
    }
  }

  // --- Render Asian Handicap Market & Movement ---
  function renderAHBoard(match) {
    const activeAH = (state.oddsType === 'opening') ? match.openAH : match.closeAH;
    if (!activeAH || activeAH.line === null || activeAH.line === undefined || !activeAH.h || !activeAH.a) {
      console.warn('activeAH missing for AH match:', match);
      DOM.ahLabelH.textContent = match.home.zh;
      DOM.ahLabelA.textContent = match.away.zh;
      DOM.ahLineH.textContent = '—';
      DOM.ahLineA.textContent = '—';
      DOM.ahOddsH.textContent = '—';
      DOM.ahOddsA.textContent = '—';
      DOM.favBadgeAhH.innerHTML = '';
      DOM.favBadgeAhA.innerHTML = '';
      [DOM.btnPickAhH, DOM.btnPickAhA].forEach(btn => {
        btn.classList.remove('selected');
        btn.disabled = true;
        btn.setAttribute('aria-pressed', 'false');
      });
      DOM.ahMovementFlowText.textContent = '此賽事無可用的亞洲讓球盤數據';
      DOM.ahLineShiftBadge.style.display = 'none';
      return;
    }

    // Line for Home and Away
    const homeLine = activeAH.line;
    const awayLine = -activeAH.line;

    DOM.ahLabelH.textContent = match.home.zh;
    DOM.ahLabelA.textContent = match.away.zh;

    DOM.ahLineH.textContent = formatAHLine(homeLine);
    DOM.ahLineA.textContent = formatAHLine(awayLine);

    DOM.ahOddsH.textContent = activeAH.h.toFixed(2);
    DOM.ahOddsA.textContent = activeAH.a.toFixed(2);

    // Favourite determination in AH: lower odds is favourite; if equal, Home side
    const ahFav = activeAH.h <= activeAH.a ? 'AH_H' : 'AH_A';
    DOM.favBadgeAhH.innerHTML = ahFav === 'AH_H' ? '<span class="fav-badge">讓球熱門 🔥</span>' : '';
    DOM.favBadgeAhA.innerHTML = ahFav === 'AH_A' ? '<span class="fav-badge">讓球熱門 🔥</span>' : '';

    [DOM.btnPickAhH, DOM.btnPickAhA].forEach(btn => {
      btn.classList.remove('selected');
      btn.disabled = false;
      btn.setAttribute('aria-pressed', 'false');
    });

    // AH Movement Display
    if (match.openAH && match.closeAH) {
      const oText = `初盤：主 ${formatAHLine(match.openAH.line)} (主 ${match.openAH.h.toFixed(2)} / 客 ${match.openAH.a.toFixed(2)})`;
      const cText = `終盤：主 ${formatAHLine(match.closeAH.line)} (主 ${match.closeAH.h.toFixed(2)} / 客 ${match.closeAH.a.toFixed(2)})`;
      DOM.ahMovementFlowText.textContent = `${oText} ➔ ${cText}`;

      if (match.openAH.line !== match.closeAH.line) {
        const shiftedMore = match.closeAH.line < match.openAH.line; // e.g. -0.5 to -0.75 means home gives more goals
        const shiftNote = shiftedMore ? '主隊受捧（讓球升盤）' : '客隊受捧（盤口縮窄）';
        DOM.ahLineShiftBadge.textContent = `盤口變動：${shiftNote} (${match.openAH.line} ➔ ${match.closeAH.line})`;
        DOM.ahLineShiftBadge.style.display = 'inline-block';
      } else {
        const waterShift = match.closeAH.h < match.openAH.h ? '主隊水位受壓下調' : (match.closeAH.h > match.openAH.h ? '客隊水位受壓下調' : '水位盤口持平');
        DOM.ahLineShiftBadge.textContent = `盤口持平：${waterShift}`;
        DOM.ahLineShiftBadge.style.display = 'inline-block';
      }
    } else {
      const typeLabel = state.oddsType === 'opening' ? '初盤讓球' : '終盤讓球';
      DOM.ahMovementFlowText.textContent = `${typeLabel}：主 ${formatAHLine(activeAH.line)} (主 ${activeAH.h.toFixed(2)} / 客 ${activeAH.a.toFixed(2)})`;
      DOM.ahLineShiftBadge.style.display = 'none';
    }
  }

  // --- Pick Selection Handling ---
  function handlePick(pick) {
    if (state.isRoundRevealed) return;
    const match = state.sessionMatches[state.currentRoundIdx];
    if (!match) return;

    if (state.betMode === '1x2') {
      const activeOdds = (state.oddsType === 'opening') ? match.open1X2 : match.close1X2;
      if (!activeOdds || !activeOdds.h || !activeOdds.d || !activeOdds.a) {
        return; // Refuse handlePick when active 1X2 market is missing
      }

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
    } else {
      const activeAH = (state.oddsType === 'opening') ? match.openAH : match.closeAH;
      if (!activeAH || activeAH.line === null || activeAH.line === undefined || !activeAH.h || !activeAH.a) {
        return; // Refuse handlePick when active AH market is missing
      }

      state.selectedPick = pick;
      [
        { btn: DOM.btnPickAhH, key: 'AH_H' },
        { btn: DOM.btnPickAhA, key: 'AH_A' }
      ].forEach(item => {
        const isSelected = item.key === pick;
        item.btn.classList.toggle('selected', isSelected);
        item.btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      });

      const teamLabel = pick === 'AH_H' ? `${match.home.zh} (主)` : `${match.away.zh} (客)`;
      DOM.revealBtn.disabled = false;
      DOM.revealBtnText.textContent = `確認下注【${teamLabel}】· 揭曉賽果 📢`;
    }

    DOM.revealBtn.focus();
  }

  // --- Exact Score Stepper Handling ---
  function updateScoreDisplay() {
    DOM.stepperHomeVal.textContent = state.guessHome !== null ? state.guessHome : '—';
    DOM.stepperAwayVal.textContent = state.guessAway !== null ? state.guessAway : '—';
  }

  function handleScoreToggle() {
    if (state.isRoundRevealed) return;
    state.exactScoreActive = DOM.exactScoreToggle.checked;
    DOM.exactScoreSteppers.style.display = state.exactScoreActive ? 'flex' : 'none';
    if (state.exactScoreActive) {
      updateScoreDisplay();
    }
  }

  function clearExactScore() {
    if (state.isRoundRevealed) return;
    DOM.exactScoreToggle.checked = false;
    state.exactScoreActive = false;
    state.guessHome = null;
    state.guessAway = null;
    DOM.exactScoreSteppers.style.display = 'none';
    updateScoreDisplay();
  }

  // --- Match Reroll Logic (換一場) ---
  function handleReroll() {
    if (state.isRoundRevealed || state.isAdvancing) return;
    if (!state.unusedPool || state.unusedPool.length === 0) return;

    // Pick another random match from unused pool
    const randIdx = Math.floor(Math.random() * state.unusedPool.length);
    const newMatch = state.unusedPool.splice(randIdx, 1)[0];

    // Replace current match (replaced match is discarded and not reused)
    state.sessionMatches[state.currentRoundIdx] = newMatch;
    state.rerollCount++;

    // Reload current match slot with the new match
    loadRound(state.currentRoundIdx);
  }

  // --- Reveal Result & Settlement Logic ---
  function revealRound() {
    if (state.isRoundRevealed || !state.selectedPick) return;

    const match = state.sessionMatches[state.currentRoundIdx];
    if (!match) return;

    // Guard: Check market availability BEFORE setting isRoundRevealed or disabling controls
    let isMarketMissing = false;
    if (state.betMode === '1x2') {
      const activeOdds = (state.oddsType === 'opening') ? match.open1X2 : match.close1X2;
      if (!activeOdds || !activeOdds.h || !activeOdds.d || !activeOdds.a) {
        isMarketMissing = true;
      }
    } else {
      const activeAH = (state.oddsType === 'opening') ? match.openAH : match.closeAH;
      if (!activeAH || activeAH.line === null || activeAH.line === undefined || !activeAH.h || !activeAH.a) {
        isMarketMissing = true;
      }
    }

    if (isMarketMissing) {
      if (state.unusedPool && state.unusedPool.length > 0) {
        alert('此比賽缺少對應盤口賠率數據，系統已自動為你更換另一場比賽！');
        handleReroll();
      } else {
        alert('此比賽缺少對應盤口賠率數據，請返回設定或重設賽事。');
        state.selectedPick = null;
        DOM.revealBtn.disabled = true;
        DOM.revealBtnText.textContent = '此場賽事無有效賠率數據';
      }
      return;
    }

    state.isRoundRevealed = true;
    const stake = state.stake;

    // Disable betting buttons, reroll button & exact score
    if (DOM.rerollBtn) DOM.rerollBtn.disabled = true;
    [DOM.btnPickH, DOM.btnPickD, DOM.btnPickA, DOM.btnPickAhH, DOM.btnPickAhA].forEach(b => {
      if (b) b.disabled = true;
    });
    DOM.exactScoreToggle.disabled = true;
    DOM.stepperHomeMinus.disabled = true;
    DOM.stepperHomePlus.disabled = true;
    DOM.stepperAwayMinus.disabled = true;
    DOM.stepperAwayPlus.disabled = true;
    DOM.clearScoreBtn.disabled = true;

    // 1. Player Settlement
    let playerPL = 0;
    let playerOutcomeStr = '';
    let playerOutcomeKey = '';
    let playerPickedOdds = 1.0;
    let playerBetDesc = '';

    // 2. Baseline AI Opponent Settlement
    let baselinePL = 0;
    let baselinePickedOdds = 1.0;
    let baselinePickKey = '';
    let baselineOutcomeStr = '';
    let baselineBetDesc = '';

    if (state.betMode === '1x2') {
      const activeOdds = (state.oddsType === 'opening') ? match.open1X2 : match.close1X2;
      const math = calculateOddsMath(activeOdds.h, activeOdds.d, activeOdds.a);

      // Player 1X2
      playerPickedOdds = activeOdds[state.selectedPick.toLowerCase()];
      const isHit1x2 = state.selectedPick === match.ftr;
      const outcomeLabels = { H: '主勝', D: '和局', A: '客勝' };
      playerBetDesc = `1X2 ${outcomeLabels[state.selectedPick]}`;

      if (isHit1x2) {
        playerPL = stake * (playerPickedOdds - 1);
        playerOutcomeKey = 'win';
        playerOutcomeStr = `命中【${outcomeLabels[state.selectedPick]}】！獲利 ${formatPL(playerPL)} 注`;
      } else {
        playerPL = -stake;
        playerOutcomeKey = 'loss';
        playerOutcomeStr = `未中【${outcomeLabels[state.selectedPick]}】！損失 -${formatNum(stake)} 注`;
      }

      // Baseline AI 1X2 (always backs lowest odds favourite)
      baselinePickKey = math.fav;
      baselinePickedOdds = activeOdds[baselinePickKey.toLowerCase()];
      baselineBetDesc = `1X2 ${outcomeLabels[baselinePickKey]}`;
      const isBaselineHit = baselinePickKey === match.ftr;

      if (isBaselineHit) {
        baselinePL = stake * (baselinePickedOdds - 1);
        baselineOutcomeStr = `命中 ${outcomeLabels[baselinePickKey]} (${formatPL(baselinePL)} 注)`;
      } else {
        baselinePL = -stake;
        baselineOutcomeStr = `未中 ${outcomeLabels[baselinePickKey]} (-${formatNum(stake)} 注)`;
      }

    } else {
      // Asian Handicap Mode
      const activeAH = (state.oddsType === 'opening') ? match.openAH : match.closeAH;
      const goalDiffH = match.fthg - match.ftag; // Home goal diff

      // Player AH
      const isHomeBack = state.selectedPick === 'AH_H';
      const playerDiff = isHomeBack ? goalDiffH : -goalDiffH;
      const playerLine = isHomeBack ? activeAH.line : -activeAH.line;
      playerPickedOdds = isHomeBack ? activeAH.h : activeAH.a;
      playerBetDesc = isHomeBack ? `${match.home.zh} (${formatAHLine(playerLine)})` : `${match.away.zh} (${formatAHLine(playerLine)})`;

      // Settle via pure settleAH function in ah.js
      const ahResult = window.settleAH(playerDiff, playerLine, playerPickedOdds, stake);
      playerPL = ahResult.profit;
      playerOutcomeKey = ahResult.outcome;

      const ahOutcomeCantonese = {
        win: '贏足全盤！',
        halfwin: '贏半個盤！',
        push: '走盤退注！',
        halfloss: '輸半個盤！',
        loss: '全輸！'
      };
      playerOutcomeStr = `${ahOutcomeCantonese[ahResult.outcome] || ''} 獲利 ${formatPL(playerPL)} 注`;

      // Baseline AI AH (backs AH favourite: lower odds, or home if equal)
      const isAiHome = activeAH.h <= activeAH.a;
      baselinePickKey = isAiHome ? 'AH_H' : 'AH_A';
      const aiDiff = isAiHome ? goalDiffH : -goalDiffH;
      const aiLine = isAiHome ? activeAH.line : -activeAH.line;
      baselinePickedOdds = isAiHome ? activeAH.h : activeAH.a;
      baselineBetDesc = isAiHome ? `${match.home.zh} (${formatAHLine(aiLine)})` : `${match.away.zh} (${formatAHLine(aiLine)})`;

      const aiAhResult = window.settleAH(aiDiff, aiLine, baselinePickedOdds, stake);
      baselinePL = aiAhResult.profit;
      baselineOutcomeStr = `${ahOutcomeCantonese[aiAhResult.outcome] || ''} (${formatPL(baselinePL)} 注，買${isAiHome ? '主隊' : '客隊'})`;
    }

    // 3. Exact Score Guess Bonus
    let isHitScore = false;
    let exactScoreBonus = 0;
    const isScoreCommitted = state.exactScoreActive && state.guessHome !== null && state.guessAway !== null;
    if (isScoreCommitted) {
      if (state.guessHome === match.fthg && state.guessAway === match.ftag) {
        isHitScore = true;
        exactScoreBonus = 20; // 20 units fixed bonus
      }
    }

    const totalPlayerRoundPL = playerPL + exactScoreBonus;
    state.playerBankroll += totalPlayerRoundPL;
    state.baselineBankroll += baselinePL;

    // Record recap
    state.sessionRecap.push({
      round: state.currentRoundIdx + 1,
      match: match,
      betMode: state.betMode,
      playerPick: state.selectedPick,
      playerBetDesc: playerBetDesc,
      playerOdds: playerPickedOdds,
      playerOutcomeKey: playerOutcomeKey,
      playerPL: totalPlayerRoundPL,
      exactScoreActive: isScoreCommitted,
      guessHome: state.guessHome,
      guessAway: state.guessAway,
      isHitScore: isHitScore,
      exactBonus: exactScoreBonus,
      baselineBetDesc: baselineBetDesc,
      baselineOdds: baselinePickedOdds,
      baselinePL: baselinePL,
      playerBankrollAfter: state.playerBankroll,
      baselineBankrollAfter: state.baselineBankroll
    });

    // --- UI Update on Reveal ---
    DOM.vsBadge.style.display = 'none';
    DOM.revealedScoreBox.style.display = 'flex';
    DOM.ftScoreText.textContent = `${match.fthg} - ${match.ftag}`;

    let subText = '';
    if (match.hthg !== null && match.htag !== null) {
      subText = `半場 ${match.hthg}-${match.htag}`;
    } else {
      subText = '全場完';
    }
    DOM.subScoreText.textContent = subText;

    const ftrMap = { H: '主勝', D: '和局', A: '客勝' };
    DOM.outcomeTag.textContent = ftrMap[match.ftr] || '賽果';

    // Update HUD
    DOM.playerBankrollDisplay.innerHTML = `${formatNum(state.playerBankroll)} <span class="unit">注</span>`;
    DOM.baselineBankrollDisplay.innerHTML = `${formatNum(state.baselineBankroll)} <span class="unit">注</span>`;

    DOM.playerChangeDisplay.textContent = `${formatPL(totalPlayerRoundPL)} 注`;
    DOM.playerChangeDisplay.className = `bankroll-change ${totalPlayerRoundPL >= 0 ? 'pos' : 'neg'}`;

    DOM.baselineChangeDisplay.textContent = `${formatPL(baselinePL)} 注`;
    DOM.baselineChangeDisplay.className = `bankroll-change ${baselinePL >= 0 ? 'pos' : 'neg'}`;

    // Reveal Result Card Content
    DOM.revealBtn.style.display = 'none';
    DOM.roundResultCard.style.display = 'flex';

    if (totalPlayerRoundPL > 0) {
      DOM.resultStatusIcon.textContent = '🎉';
    } else if (totalPlayerRoundPL === 0) {
      DOM.resultStatusIcon.textContent = '🤝';
    } else {
      DOM.resultStatusIcon.textContent = '❌';
    }

    DOM.statusMainText.textContent = playerOutcomeStr;

    if (isScoreCommitted) {
      if (isHitScore) {
        DOM.statusSubText.textContent = `🎯 波膽命中 ${state.guessHome}-${state.guessAway}！特別獎勵 +20.0 注！`;
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

    DOM.baselineRoundPl.textContent = `${formatPL(baselinePL)} 注 (${baselineOutcomeStr})`;
    DOM.baselineRoundPl.style.color = baselinePL >= 0 ? '#38ef7d' : '#ff4757';

    DOM.nextRoundBtn.focus();
  }

  // --- Advance to Next Round or End Screen ---
  function advanceNextRound() {
    if (!state.isRoundRevealed || state.isAdvancing) return;
    state.isAdvancing = true;

    if (state.currentRoundIdx < state.roundsCount - 1) {
      state.currentRoundIdx++;
      loadRound(state.currentRoundIdx);
    } else {
      showEndScreen();
    }
  }

  // --- End Screen Summary ---
  function showEndScreen() {
    state.isAdvancing = false;
    state.endScreenOpenedAt = Date.now();
    showScreen(DOM.endScreen);

    const playerFinal = state.playerBankroll;
    const baselineFinal = state.baselineBankroll;
    const initial = state.startingBankroll;
    const netPL = playerFinal - initial;
    const baselineNetPL = baselineFinal - initial;

    const roiPct = (netPL / initial) * 100;

    const winRounds = state.sessionRecap.filter(r => r.playerPL > 0).length;
    const exactHits = state.sessionRecap.filter(r => r.isHitScore).length;

    DOM.endTitleText.textContent = `${state.roundsCount} 場激戰結束！`;

    // Verdict determination via pure function (verdict.js) with robust inline fallback
    let v;
    if (typeof window.calculateVerdict === 'function') {
      v = window.calculateVerdict(playerFinal, baselineFinal, initial);
    } else {
      const pNet = (Math.round((playerFinal - initial) * 10) / 10) || 0;
      const bNet = (Math.round((baselineFinal - initial) * 10) / 10) || 0;
      const dAI = (Math.round((playerFinal - baselineFinal) * 10) / 10) || 0;
      const absP = Math.abs(pNet).toFixed(1);
      const absD = Math.abs(dAI).toFixed(1);

      let title = '打和 / 保本';
      let statusClass = 'draw';
      let trophy = '🤝';
      let bookiePnlText = '今局同莊家打和（保本不失）';

      if (pNet > 0) {
        title = '贏咗莊家！';
        statusClass = 'win';
        trophy = '🏆';
        bookiePnlText = `你今局贏咗莊家 ${absP} 注`;
      } else if (pNet < 0) {
        title = '輸給莊家';
        statusClass = 'loss';
        trophy = '📉';
        bookiePnlText = `莊家今局喺你身上贏咗 ${absP} 注`;
      }

      let subtitle = '同電腦對手打和';
      let detail = '大戰結束，大家本金分毫不差，同莊家與電腦對手雙雙平手！';
      if (pNet > 0) {
        if (dAI > 0) {
          subtitle = `仲贏埋電腦對手 ${absD} 注`;
          detail = '犀利！你成功戰勝莊家抽水，而且成績好過盲跟熱門嘅電腦對手！';
        } else if (dAI < 0) {
          subtitle = `但電腦對手贏你 ${absD} 注`;
          detail = '好嘢！你成功喺莊家手上贏到錢，不過電腦對手今局盲跟熱門斬獲更多！';
        } else {
          subtitle = '同電腦對手打和';
          detail = '好嘢！你同電腦對手雙雙擊敗莊家，戰績完全一致！';
        }
      } else if (pNet < 0) {
        if (dAI > 0) {
          subtitle = `但你贏咗電腦對手 ${absD} 注`;
          detail = '雖然今局輸畀莊家抽水，但你嘅表現依然好過盲跟熱門嘅電腦對手，輸少當贏！';
        } else if (dAI < 0) {
          subtitle = `電腦對手贏你 ${absD} 注`;
          detail = '莊家抽水無情，今局盲跟熱門策略稍勝一籌，收拾心情再接再厲！';
        } else {
          subtitle = '同電腦對手打和';
          detail = '你同電腦對手今局成績一樣，齊齊畀莊家抽水，下局再戰！';
        }
      } else {
        if (dAI > 0) {
          subtitle = `兼且贏咗電腦對手 ${absD} 注`;
          detail = '成功保本不失！而且成績壓倒盲跟熱門嘅電腦對手，立於不敗之地！';
        } else if (dAI < 0) {
          subtitle = `但電腦對手贏你 ${absD} 注`;
          detail = '成功保本不失，但電腦對手盲跟熱門賺咗少少，下局再挑戰贏莊家！';
        }
      }

      v = { title, subtitle, detail, bookiePnlText, statusClass, trophy, playerNet: pNet, baselineNet: bNet, diffVsAI: dAI };
    }

    DOM.endTrophyBadge.textContent = v.trophy;
    DOM.verdictBanner.className = `verdict-banner ${v.statusClass}`;
    DOM.verdictText.textContent = v.title;
    if (DOM.verdictSubtitle) {
      DOM.verdictSubtitle.textContent = v.subtitle;
    }
    if (DOM.bookiePnlBanner) {
      DOM.bookiePnlBanner.className = `bookie-pnl-banner ${v.statusClass}`;
    }
    if (DOM.bookiePnlText) {
      DOM.bookiePnlText.textContent = v.bookiePnlText;
    }
    DOM.verdictDetail.textContent = v.detail;

    // Best Score Handling
    const previousBest = getBestScore(initial);
    const isNewRecord = saveBestScore(playerFinal, initial);
    const currentBest = getBestScore(initial);

    if (currentBest !== null) {
      DOM.endBestScore.textContent = `${formatNum(currentBest)} 注`;
      if (isNewRecord) {
        DOM.endRecordSub.textContent = '🎉 刷新個人最高紀錄！';
        DOM.endRecordSub.style.color = '#ffd700';
      } else {
        DOM.endRecordSub.textContent = '維持紀錄';
        DOM.endRecordSub.style.color = '';
      }
    } else {
      DOM.endBestScore.textContent = '暫無盈利紀錄';
      DOM.endRecordSub.textContent = playerFinal <= initial ? '今局未達盈利門檻' : '未能儲存本機紀錄';
      DOM.endRecordSub.style.color = '';
    }

    // Fill Stat Cards
    DOM.statFinalBankroll.innerHTML = `${formatNum(playerFinal)} <span class="sub-unit">注</span>`;
    DOM.statNetPl.textContent = `淨獲利：${formatPL(netPL)} 注`;

    DOM.statBaselineBankroll.innerHTML = `${formatNum(baselineFinal)} <span class="sub-unit">注</span>`;
    DOM.statBaselinePl.textContent = `淨獲利：${formatPL(baselineNetPL)} 注`;

    DOM.statHitRate.textContent = `${winRounds} / ${state.roundsCount}`;
    DOM.statHitPct.textContent = `勝率 ${((winRounds / state.roundsCount) * 100).toFixed(1)}%`;

    DOM.statScoreHits.textContent = `${exactHits} / ${state.roundsCount}`;
    const bonusTotal = exactHits * 20;
    DOM.statScoreBonusSub.textContent = exactHits > 0 ? `額外彩金 +${bonusTotal} 注` : '無額外彩金';

    DOM.statRoi.textContent = `${formatPL(roiPct)}%`;
    DOM.statRoiSub.textContent = `基於本金 ${formatNum(initial)} 注`;

    if (DOM.statRerollCount) {
      DOM.statRerollCount.innerHTML = `${state.rerollCount} <span class="sub-unit">次</span>`;
    }
    if (DOM.statRerollSub) {
      DOM.statRerollSub.textContent = state.rerollCount > 0 ? `共重新抽換 ${state.rerollCount} 場賽事` : '今局全程無換場';
    }

    // Render Recap List
    DOM.recapSectionTitle.textContent = `逐場賽果與結算詳情 (共 ${state.roundsCount} 場)`;
    DOM.recapListContainer.innerHTML = '';

    state.sessionRecap.forEach(r => {
      const row = document.createElement('div');
      row.className = 'recap-item';

      let pickDesc = `你揀：${r.playerBetDesc} (${r.playerOdds.toFixed(2)})`;
      if (r.exactScoreActive && r.guessHome !== null && r.guessAway !== null) {
        pickDesc += ` · 波膽 ${r.guessHome}-${r.guessAway}`;
        if (r.isHitScore) pickDesc += ' 🎯中';
      }

      const plClass = r.playerPL >= 0 ? 'win' : 'loss';

      row.innerHTML = `
        <div class="recap-round-num">#${r.round}</div>
        <div class="recap-match-details">
          <div class="recap-fixture">
            [${r.match.compName}] ${r.match.home.zh} <span class="ft-score">${r.match.fthg} - ${r.match.ftag}</span> ${r.match.away.zh}
          </div>
          <div class="recap-picks">
            ${pickDesc} ｜ 賽果：${r.match.fthg}-${r.match.ftag}
          </div>
        </div>
        <div class="recap-pl-badge ${plClass}">
          ${formatPL(r.playerPL)} 注
        </div>
      `;
      DOM.recapListContainer.appendChild(row);
    });
  }

  // --- Event Listeners Setup ---
  function setupEvents() {
    // 1X2 buttons
    DOM.btnPickH.addEventListener('click', () => handlePick('H'));
    DOM.btnPickD.addEventListener('click', () => handlePick('D'));
    DOM.btnPickA.addEventListener('click', () => handlePick('A'));

    // Asian Handicap buttons
    DOM.btnPickAhH.addEventListener('click', () => handlePick('AH_H'));
    DOM.btnPickAhA.addEventListener('click', () => handlePick('AH_A'));

    // Exact score toggle & steppers
    DOM.exactScoreToggle.addEventListener('change', handleScoreToggle);
    DOM.clearScoreBtn.addEventListener('click', clearExactScore);

    DOM.stepperHomeMinus.addEventListener('click', () => {
      if (state.isRoundRevealed) return;
      if (state.guessHome === null) state.guessHome = 0;
      else if (state.guessHome > 0) state.guessHome--;
      updateScoreDisplay();
    });
    DOM.stepperHomePlus.addEventListener('click', () => {
      if (state.isRoundRevealed) return;
      if (state.guessHome === null) state.guessHome = 0;
      else if (state.guessHome < 9) state.guessHome++;
      updateScoreDisplay();
    });

    DOM.stepperAwayMinus.addEventListener('click', () => {
      if (state.isRoundRevealed) return;
      if (state.guessAway === null) state.guessAway = 0;
      else if (state.guessAway > 0) state.guessAway--;
      updateScoreDisplay();
    });
    DOM.stepperAwayPlus.addEventListener('click', () => {
      if (state.isRoundRevealed) return;
      if (state.guessAway === null) state.guessAway = 0;
      else if (state.guessAway < 9) state.guessAway++;
      updateScoreDisplay();
    });

    // Reveal & Advance
    DOM.revealBtn.addEventListener('click', revealRound);
    DOM.nextRoundBtn.addEventListener('click', advanceNextRound);

    // Reroll match button
    if (DOM.rerollBtn) {
      DOM.rerollBtn.addEventListener('click', handleReroll);
    }

    // End Actions
    DOM.replayBtn.addEventListener('click', () => {
      if (Date.now() - state.endScreenOpenedAt < 500) return;
      startNewGame();
    });
    DOM.homeBtn.addEventListener('click', () => {
      updateStartScreenBestScore();
      updateLivePoolCount();
      showScreen(DOM.startScreen);
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const key = e.key.toUpperCase();

      // In Game Screen keyboard shortcuts
      if (DOM.gameScreen.classList.contains('active') && !state.isRoundRevealed) {
        if (key === 'R') {
          e.preventDefault();
          handleReroll();
          return;
        }

        if (state.betMode === '1x2') {
          if (key === '1') {
            e.preventDefault();
            handlePick('H');
            return;
          } else if (key === 'X' || key === '0') {
            e.preventDefault();
            handlePick('D');
            return;
          } else if (key === '2') {
            e.preventDefault();
            handlePick('A');
            return;
          }
        } else {
          // AH mode: 1 for Home, 2 for Away
          if (key === '1') {
            e.preventDefault();
            handlePick('AH_H');
            return;
          } else if (key === '2') {
            e.preventDefault();
            handlePick('AH_A');
            return;
          }
        }
      }

      // Enter / Space navigation
      const targetEl = (e.target && e.target.nodeType === 1) ? e.target : null;
      const primaryCtas = ['start-game-btn', 'reveal-btn', 'next-round-btn', 'replay-btn'];
      const isOddsBtn = targetEl && targetEl.closest('.odds-choice-btn');
      const isPrimaryCta = targetEl && (primaryCtas.includes(targetEl.id) || (isOddsBtn && state.selectedPick !== null));
      const isOtherInteractive = targetEl && targetEl.closest('button, input, select, details, [role="radio"]') && !isPrimaryCta;

      if (isOtherInteractive) return;

      if (e.key === 'Enter' || e.key === ' ') {
        if (DOM.gameScreen.classList.contains('active')) {
          if (!state.isRoundRevealed) {
            if (state.selectedPick) {
              e.preventDefault();
              revealRound();
            }
          } else {
            e.preventDefault();
            advanceNextRound();
          }
        } else if (DOM.startScreen.classList.contains('active')) {
          if (!DOM.startGameBtn.disabled) {
            e.preventDefault();
            startNewGame();
          }
        } else if (DOM.endScreen.classList.contains('active')) {
          if (Date.now() - state.endScreenOpenedAt < 500) return;
          e.preventDefault();
          startNewGame();
        }
      }
    });
  }

  // --- Initializer ---
  document.addEventListener('DOMContentLoaded', () => {
    initDOMElements();
    initStartScreen();
    setupEvents();
    if (typeof window !== 'undefined') {
      window.__BTB_TEST__ = { state, DOM, showEndScreen, formatNum, formatPL, getBestScore, saveBestScore };
    }
  });
})();
