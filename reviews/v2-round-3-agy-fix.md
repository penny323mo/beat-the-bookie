# Beat the Bookie v2 — Round 3 Fix Report

對應 `reviews/v2-round-3.md` 所列出之兩項 Minor 項目進行修正與測試驗證。依指示保持數據真實性、不執行 `git commit`。

---

## 📋 修正清單與實作詳情

### 1. 缺賠率 Guard 前置執行與防卡死處理 (Minor 1)
- **問題**：先前 `revealRound()` 的賠率 null guard 位於 `state.isRoundRevealed = true` 及按鈕禁用之後執行。若發生賠率缺失，函式 `return` 會導致介面停留在無戰報卡、無法按下一場、亦無法換場的卡死狀態；此外鍵盤快捷鍵 `1`/`X`/`2` 在按鈕被 disabled 時仍可能觸發 `handlePick`。
- **修正**：
  1. [`game.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/game.js) 的 `handlePick(pick)` 前置檢查當前場次是否具備有效賠率（1X2 需具備 `activeOdds.h/d/a`，AH 需具備 `activeAH.line/h/a`）。若盤口缺失，拒絕選取並直接返回，使滑鼠點擊及鍵盤快捷鍵均無法 arm 起揭曉按鈕。
  2. 將 `revealRound()` 中的賠率有效性檢查移至最頂端（在設定 `state.isRoundRevealed = true` 及禁用按鈕之前執行）。
  3. 若揭曉時檢測到盤口缺失：
     - 若備用池仍有剩餘未用賽事（`state.unusedPool.length > 0`），彈出廣東話提示（「此比賽缺少對應盤口賠率數據，系統已自動為你更換另一場比賽！」），並自動呼叫 `handleReroll()` 為玩家抽換新比賽，遊戲無縫繼續；
     - 若備用池已空，彈出提示並重設選取狀態，保持介面可操作性，絕不鎖死。

---

### 2. `ah.js` 採用 `Number.isFinite` 嚴格拒絕 `NaN` / `Infinity` (Minor 2)
- **問題**：`ah.js` 先前使用 `typeof x !== 'number'` 檢查引數，由於在 JavaScript 中 `typeof NaN === 'number'` 及 `typeof Infinity === 'number'`，傳入 `NaN` 時不會拋出 TypeError，而是會穿透落入 `loss` 分支計算。
- **修正**：
  1. 在 [`ah.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/ah.js) 中改用 `Number.isFinite(...)` 嚴格檢驗所有四個引數：
     ```javascript
     if (!Number.isFinite(goalDiffForBackedSide) || !Number.isFinite(line) ||
         !Number.isFinite(odds) || !Number.isFinite(stake)) {
       throw new TypeError('Invalid arguments to settleAH: all arguments must be finite numbers');
     }
     ```
  2. 在 [`tests/ah.test.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/tests/ah.test.js) 新增第 24 組測試案例，完整測試 `NaN`（球差/盤口/賠率/注碼各別為 NaN）、`Infinity` / `-Infinity`、字串、`null`、`undefined` 及無引數呼叫，斷言全數拋出 `TypeError`。

---

## 🧪 測試驗證

### 1. 單元測試
```bash
node tests/ah.test.js
```
```
--- Running Asian Handicap (settleAH) Unit Tests ---

Results: 74 / 74 tests passed.
✅ ALL ASIAN HANDICAP UNIT TESTS PASSED!
```

### 2. 端到端 CDP 瀏覽器自動化測試
```bash
node --experimental-websocket test_e2e.js
```
- **測試環境**：390px 視口寬度 Headless Chrome、純 `file://` 協議、零外網連線。
- **測試結果**：
  - 即時場數與盤口切換正常（主客和初盤 8,907 場、終盤 11,188 場、亞洲盤 8,908 場）。
  - 全部觸控目標實測 $\ge 44\text{px}$。
  - 換一場功能正常，揭曉後停用。
  - 1X2 與亞洲盤對決與結算流暢完成。
  - 控制台無任何報錯：`✅ ZERO CONSOLE ERRORS!`。
  - `🎉 ALL END-TO-END AUTOMATED BROWSER TESTS PASSED PERFECTLY!`。

---

## 📌 結論
Round 3 提出的兩項 Minor 項目已全數解決並通過 100% 測試驗證。依指示**未執行 `git commit`**，全部修改完整保留於本地工作目錄。
