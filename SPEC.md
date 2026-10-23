# SPEC — 「你估得贏莊家嗎？」(Beat the Bookie v2)

Single-page browser game using REAL European football data (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, UEFA Champions League, UEFA Europa League, UEFA Conference League across 5 seasons 2021/22 - 2025/26). Runs 100% offline by double-clicking `index.html` (`file://`, zero server, zero network, zero `fetch()`, zero external dependencies).

## Files & Data Architecture
- `build_data.py` — Python 3 data processor. Reads 25 league CSVs from `raw/` and 3 footiqo cup JSON files. Generates lean, compact JavaScript data files:
  - `data/meta.js`: Metadata including competitions, seasons, schema, match counts by comp/season (total & AH), and all 277 teams with Cantonese translations.
  - `data/{epl,laliga,seriea,bundesliga,ligue1,ucl,uel,uecl}.js`: Compact match arrays lazy-loaded dynamically via `<script>` tags. Total raw size < 1.5MB.
- `team_names.py` — Cantonese translations (香港/澳門常用譯名) for all 277 teams across all 8 competitions.
- `ah.js` — Pure function `settleAH(goalDiffForBackedSide, line, odds, stake)` implementing full, half, and quarter-ball Asian Handicap settlement rules (`win`, `halfwin`, `push`, `halfloss`, `loss`). Works in browser (`window.settleAH`) and Node.js (`module.exports`).
- `tests/ah.test.js` — Automated unit test suite covering lines `0, ±0.25, ±0.5, ±0.75, ±1, ±1.25, -1.5, +2` for home and away sides.
- `index.html`, `style.css`, `game.js` — Complete game UI and logic in authentic Cantonese (廣東話).
- `README.md` — Project documentation and run guide.

## Gameplay & Features
1. **Setup Screen (進階賽事設定)**:
   - **賽事選擇 (Competitions)**: 5 leagues + 3 cups with quick toggles (「全選」、「五大聯賽」、「歐洲賽」).
   - **賽季選擇 (Seasons)**: 2021/22 - 2025/26 individually selectable chips with 「全選 / 全部唔揀」 toggle.
   - **玩法模式 (Bet Mode)**: 1X2 (主/和/客) 或 亞洲盤 (Asian Handicap 讓球盤)。選擇亞洲盤時只挑選具備讓球盤數據嘅聯賽賽事。
   - **盤口類型 (Odds Type)**: 初盤 (Opening) 或 終盤 (Closing)。歐洲賽僅設終盤1X2賠率。
   - **每局場數 (Rounds)**: 5 / 10 / 20 / 30 場及自訂數字 (1..可用場數)。
   - **注碼與本金 (Stake & Bankroll)**: 每注 5 / 10 / 20 或自訂注碼，預設 100 注初始本金。
   - **進階篩選 (Collapsible Advanced Filter)**: 摺疊面板，可輸入中文搜尋/指定球隊，以及指定比賽日期範圍。
   - **即時可用場數 (Live Pool Count)**: 「而家揀咗：N 場比賽可用」即時連動更新；若可用場數不足（或為 0）則停用開波按鈕並提示廣東話原因。
   - **歷史最高紀錄 (Best Record)**: 從 `localStorage`（`btb_best_v2`）讀取個人最高本金紀錄。

2. **Match Arena (比賽進行中)**:
   - 顯示賽事級別、賽季、日期及對賽球隊（廣東話譯名、英文名、動態隊徽 SVG）。
   - **換一場功能 (Match Reroll)**：在下注/揭曉前，設有「換一場」按鈕（支援快捷鍵 <kbd>R</kbd>）。點擊後會從同一賽事篩選池中隨機抽取另一場未曾使用過嘅比賽進行替換（被換走嘅比賽不會再次重複出現），不消耗比賽場次額度，AI 對手亦同步替換至相同賽事。下注/揭曉後或當可用賽事池無剩餘備用比賽時自動停用。支援無限次換場，比賽介面及終局戰報均會顯示累計換場次數（如「已換 3 次」）。
   - **盤口走勢與分析 (Odds Movement)**:
     - 1X2 模式：顯示初盤至終盤賠率走勢、升跌箭嘴與變動百分比 (例如 `↓ 跌 2.8%`, `↑ 升 5.2%`)，以及剔除莊家抽水後嘅真實勝率與抽水率。歐洲賽場次標註「歐洲賽只有終盤1X2賠率」。
     - 亞洲盤模式：顯示初盤讓球盤口與水位至終盤讓球盤口與水位走勢，並提示盤口變動 (升盤/降盤/受壓)。
   - **投注選擇 (Betting Choices)**:
     - 1X2 模式：主勝 (1) / 和局 (X) / 客勝 (2)。
     - 亞洲盤模式：主隊讓球 / 客隊讓球。
     - 最受莊家追捧熱門自動標示「莊家熱門 🔥」。
   - **精選波膽加賞 (Exact Score Bonus)**: 可選填預測精確比數，命中成功即獎勵 +20 注！
   - **跟莊熱門 AI 對手 (Baseline AI)**:
     - 1X2 模式：虛擬對手自動盲買最低賠率之熱門。
     - 亞洲盤模式：虛擬對手自動盲買水位較低之讓球方（若相同則買主隊）。
   - **揭曉賽果 (Reveal)**:
     - 顯示全場完場比數、半場比數。
     - 亞洲盤依據 `settleAH` 結算贏足全盤、贏半個盤、走盤退注、輸半個盤或全輸。
     - 更新雙方本金與即時損益。

3. **End Screen (賽事結算戰報)**:
   - 總結玩家與跟莊熱門 AI 之勝負判定 (🏆 贏咗莊家！ / 📉 輸咗畀莊家 / 🤝 打和！)。
   - 關鍵數據卡：最終本金、淨獲利、AI 最終本金、注碼勝出率、波膽命中數、投資回報率 (ROI %)。
   - 個人歷史紀錄刷新提示。
   - 逐場賽事回顧清單 (Recap List)：列出每場對賽、盤口走勢、玩家選擇、賽果及盈虧。
   - 「再玩一轉」與「返設定重選」按鈕。

## UI & Accessibility
- 語言：100% Authentic 廣東話 / 繁體中文 (`<html lang="zh-Hant-HK">`)。
- 移動端優先 (Mobile-First)：完美適配 iPhone Safari (390px)，按鈕觸控目標全部 $\ge 44\text{px}$。
- 鍵盤快速操作：1X2 支援 <kbd>1</kbd>, <kbd>X</kbd>, <kbd>2</kbd>；亞洲盤支援 <kbd>1</kbd>, <kbd>2</kbd>；<kbd>Space</kbd> / <kbd>Enter</kbd> 快速揭曉/前進。
- 零網絡請求、零依賴、純本機離線運行。
