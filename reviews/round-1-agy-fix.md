# Round 1 Review Fix Report — Beat the Bookie

已逐項審查並修正 `reviews/round-1.md` 所列出之全部 Major、Minor 及 Nit 項目。所有修改均維持純前端、離線 `file://` 安全運行、控制台 0 錯誤、繁體廣東話用詞及 `SPEC.md` 原定規格。

---

## 修正清單與說明

### 1. Major Issues

| # | 審查項目 | 修改檔案與位置 | 處理方式說明 |
|---|---|---|---|
| M1 | `game.js` Enter/Space 全域快捷鍵搶奪按鈕焦點操作 | `game.js` | 調整鍵盤監聽器：判斷若焦點位於非主操作按鈕之互動控制項（如 `.season-btn`、`#home-btn`、波膽 Stepper 按鈕或 Toggle 輸入框），直接退出並保留控制項自身原生操作；僅當焦點在 `body` 或四大主操作按鈕（`#start-game-btn`、`#reveal-btn`、`#next-round-btn`、`#replay-btn`）時才觸發全域快捷操作。同時為 `.season-btn` 及 `#home-btn` 加上專屬 Enter/Space 啟用監聽。 |
| M2 | `style.css` 360px 寬度下抽水率條與賽後結算列排版破版 | `style.css` | 於 `@media (max-width: 380px)` 中將 `.bookmaker-bar` 及 `.result-comparison-row` 改為直向堆疊排列（`flex-direction: column; align-items: flex-start; gap: 6px/2px`），設定 `.margin-indicator` 為 `flex-wrap: wrap`，並將數值設為 `white-space: nowrap`，防止 `%` 符號脫節換行。 |
| M3 | `style.css` 360px 寬度下精確波膽計數器橫向溢出未折行 | `style.css` | 為 `.exact-score-steppers` 加上 `flex-wrap: wrap;`；於 `@media (max-width: 380px)` 將 `.clear-score-btn` 設為佔據獨立一行（`flex-basis: 100%; text-align: center;`），確保主客計數器在窄屏下居中完整展示而不超出版面。 |

---

### 2. Minor Issues

| # | 審查項目 | 修改檔案與位置 | 處理方式說明 |
|---|---|---|---|
| m1 | HUD 及結算頁文案混入普通話「的」字 | `index.html`, `game.js`, `README.md` | 全面修正為地道廣東話用字：`你嘅本金`、`你嘅結算`、`你嘅最終本金`、`你嘅眼光…`。 |
| m2 | 波膽預設值為 1-0 而非空白（off/blank） | `index.html`, `game.js` | 初始值調整為 `guessHome = null, guessAway = null`，介面預設顯示為 `—`。僅當開關開啟且玩家確實點擊 `+`/`-` 設定兩隊數值（0–9）時，才視為有效波膽下注；未設定數值揭曉時視作未有兼估波膽，不會誤送獎金。 |
| m3 | 賽果揭曉後波膽控制項未被鎖定（disabled） | `game.js` | 於 `revealRound()` 中將 `#exact-score-toggle`、Stepper 加減按鈕及清除按鈕全數設為 `disabled = true`；於 `loadRound()` 新一輪開始時重新啟用。 |
| m4 | `advanceNextRound()` 缺少重複觸發防護防跳場 | `game.js` | 加入 `if (!state.isRoundRevealed || state.isAdvancing) return; state.isAdvancing = true;` 門閂鎖定，並於 `loadRound` 與 `showEndScreen` 解鎖，徹底杜絕快速連擊跳過場次之情況。 |
| m5 | 結算頁波膽副標題硬編碼為「彩金 +20 注」 | `index.html`, `game.js` | 標籤賦予 `id="stat-score-bonus-sub"`，在 JavaScript 中動態結算展示：有命中時顯示 `額外彩金 +${exactHitCount * 20} 注`，未命中則顯示 `無額外彩金`。 |
| m6 | 賽季單選群組（Radiogroup）未實作鍵盤巡迴（Roving Tabindex） | `index.html`, `game.js` | 在 HTML 中僅啟用中按鈕為 `tabindex="0"`，其餘設為 `-1`；在 JavaScript 中為按鈕加入方向鍵（`ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown`/`Home`/`End`）巡迴導航與焦點切換。 |
| m7 | 波膽 Checkbox 為無定位 `opacity: 0` 導致焦點外框偏移 | `style.css` | 為 `.custom-toggle-label` 加入 `position: relative;`，使用無障礙標準 clip 隱藏原始 input，並在 `:focus-visible` 時於 `.toggle-switch-visual` 呈現清晰金黃聚焦環。 |
| m8 | 結算頁逐場回顧限制高度導致多場賽果被遮蔽 | `style.css` | 將 `.recap-list` 之 `max-height` 解除（`max-height: none; overflow: visible;`），讓 10 場戰報全部平鋪展開；同時將 `.recap-fixture` 設為允許換行，窄屏下自動調整版面。 |
| m9 | 切換畫面時未主動轉移鍵盤焦點 | `game.js` | 在 `showScreen()` 中加入焦點轉移動作：主頁聚焦開波按鈕、賽事頁聚焦主勝（1）選項、結算頁聚焦再玩一轉按鈕，全面提升無障礙鍵盤操作流暢度。 |
| m10 | localStorage 存取例外時誤標為「維持紀錄」 | `game.js` | 判斷若儲存後讀取仍為 `null`（如瀏覽器私隱或 sandbox 禁止存取），將提示副標題改為 `未能儲存本機紀錄`，並如常展示當前局數累積本金。 |
| m11 | `--text-dim: #64748b` 對比度未能達到 WCAG AA | `style.css` | 將 `--text-dim` 提升至 `#94a3b8`，確保在深綠茵草地背景下的色彩對比度大於 4.5:1。 |

---

### 3. Nits (細節優化)

| # | 審查項目 | 修改檔案與位置 | 處理方式說明 |
|---|---|---|---|
| n1 | 動畫缺乏 `prefers-reduced-motion` 支援 | `style.css` | 增加 `@media (prefers-reduced-motion: reduce)` 媒體查詢，禁用足球飄浮與按鈕脈衝發光動畫。 |
| n2 | 360px 下 Stepper 點擊熱區過小 | `style.css` | 保持 Stepper 按鈕尺寸為 36×36px，符合舒適觸控規範。 |
| n3 | 介面殘留部分英文詞彙（VS、Margin、ROI） | `index.html` | 對賽標記改為「對賽」、抽水率改為「莊家抽水率：」、回報率改為「投資回報率」。 |
| n4 | 遺失賽事數據時使用原生 `alert()` | `index.html`, `game.js` | 於主頁內建可訪問之 `.error-banner` 元素，錯誤時以原生地道廣東話橫幅提示，不再跳出阻塞式彈窗。 |
| n5 | 剔除抽水隱含勝率四捨五入偶有 99.9% 或 100.1% | `game.js` | 在 `calculateOddsMath()` 中採用餘數調和計算，確保三瓣去水勝率顯示百分比之總和嚴格為 100.0%。 |
| n6 | 莊家熱門最低賠率平手判定順序註釋說明 | `game.js` | 於平手判定邏輯加上詳細註釋，明確闡述 `H > A > D` 之優先次序規範。 |

---

## 4. 自動化測試驗證

使用無頭 Chrome 經由 CDP 進行全自動化測試：
- 測試檔案：`verify_fixes.js`
- 測試環境：Viewport 360×800，`file:///workspace/nightly/2026-10-23-beat-the-bookie/index.html`
- 測試結果：
  - 賽季 Radiogroup 方向鍵巡迴及 Tab 導航正常，Enter 不會誤觸開波：✅ 通過
  - HUD 及結算廣東話「你嘅」用字檢查：✅ 通過
  - 波膽初始「—」未填狀態、點擊加減、揭曉後全面鎖定：✅ 通過
  - 10 場進程防重複跳場：✅ 通過
  - 360px 排版無破版溢出（抽水條、比較列、波膽按鈕）：✅ 通過
  - 結算頁波膽彩金動態更新及鍵盤焦點返主頁：✅ 通過
  - 瀏覽器 Console Log 錯誤/警告監控：**0 error, 0 warning**
