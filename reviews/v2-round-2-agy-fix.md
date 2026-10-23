# Beat the Bookie v2 — Round 2 Fix Report

對應 `reviews/v2-round-2.md` 所列出之全部 Minor 項目進行修正與測試驗證。依指示保持數據真實性、不執行 `git commit`。

---

## 📋 修正清單與實作詳情

### 1. `README.md` 數據庫大小數據統一 (Minor 1)
- **問題**：`README.md` 的亮點段落已標註 1.27 MB，但後方的重新生成數據庫段落（原第 104–106 行）殘留先前 Round 0 的「`data/meta.js`（約 18 KB）」及「全部檔案總大小約 1.33 MB」。
- **修正**：在 [`README.md`](file:///workspace/nightly/2026-10-23-beat-the-bookie/README.md) 中更新為 `build_data.py` 最新產出之實際大小：
  - `data/meta.js`（約 20.3 KB）
  - `data/{epl,laliga,seriea,bundesliga,ligue1,ucl,uel,uecl}.js`（每個 90 KB 至 213 KB）
  - 全部檔案總大小約 **1,295.5 KB (1.27 MB)**（符合小於 1.5 MB 規範）。

---

### 2. `activeOdds` / `activeAH` Null Guard 防禦性檢查 (Minor 2)
- **問題**：若未來賽事出現未預期缺失盤口數據或客戶端元數據不同步，直接訪問 `activeOdds.h`、`activeOdds[pick]` 或 `activeAH.line` 會拋出 TypeError 並導致揭曉流程中斷。
- **修正**：
  1. [`game.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/game.js) 的 `render1X2Board()` 加入防禦性檢查：若 `activeOdds` 缺少 `h`/`d`/`a`，安全顯示佔位符 `—`，禁用投注按鈕，走勢顯示「無賠率 / 無數據」，不拋出異常。
  2. `renderAHBoard()` 加入防禦性檢查：若 `activeAH` 缺少 `line` 或水位，安全顯示 `—`，禁用讓球投注按鈕，走勢顯示「此賽事無可用的亞洲讓球盤數據」，不拋出異常。
  3. `revealCurrentRound()` 結算邏輯前置加入檢查：若 1X2 或 AH 對應盤口物件不存在，主動彈出粵語提示（「此比賽缺少對應主客和賠率數據，無法完成結算！」 / 「此比賽缺少對應亞洲盤數據，無法完成結算！」）並安全返回，杜絕未捕獲錯誤。

---

### 3. `close1x2` 即時場數計數精確化 (Minor 3)
- **問題**：[`game.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/game.js) 第 537 行計算終盤 1X2 場數時使用了 `seasonInfo.close1x2 || (seasonInfo.total || 0)`；若未來某賽季 `close1x2` 恰好為 0，會誤退回 `total`。
- **修正**：將該行改為 `Number(seasonInfo.close1x2) || 0`，與初盤計數（`seasonInfo.open1x2 || 0`）統一標準，不再作 `total` 回退。

---

### 4. 亞洲盤走勢 Else 分支標籤連動 `state.oddsType` (Minor 4)
- **問題**：[`game.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/game.js) 原先在僅具備單一讓球盤口之 else 分支固定寫死顯示「終盤讓球」。
- **修正**：更正為根據目前玩家所選的盤口模式動態標籤：
  ```javascript
  const typeLabel = state.oddsType === 'opening' ? '初盤讓球' : '終盤讓球';
  DOM.ahMovementFlowText.textContent = `${typeLabel}：主 ${formatAHLine(activeAH.line)} (主 ${activeAH.h.toFixed(2)} / 客 ${activeAH.a.toFixed(2)})`;
  ```

---

### 5. 擴充單元測試至 $\pm 2.5$ 及 $\pm 2.75$ 讓球盤口 (Minor 5)
- **問題**：測試套件在 Round 1 已覆蓋 $0, \pm 0.25, \dots, \pm 2.25$，但可進一步為 $\pm 2.5$ 及 $\pm 2.75$ 提供專屬單元測試案例。
- **修正**：在 [`tests/ah.test.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/tests/ah.test.js) 增設 10 個全新專屬測試案例：
  - `Line +2.5`：球差 $\ge -2$ 贏足全盤（獲利 `+stake*(odds-1)`），球差 $\le -3$ 全輸（虧損 `-stake`）。
  - `Line -2.5`：球差 $\ge 3$ 贏足全盤，球差 $\le 2$ 全輸。
  - `Line +2.75`（分拆 +2.5 與 +3.0）：球差 $\ge -2$ 贏足全盤；球差等於 $-3$ 輸半個盤（+2.5 輸、+3.0 走盤，虧損 `-stake/2`）；球差 $\le -4$ 全輸。
  - `Line -2.75`（分拆 -2.5 與 -3.0）：球差 $\ge 4$ 贏足全盤；球差等於 $3$ 贏半個盤（-2.5 贏、-3.0 走盤，獲利 `+stake/2*(odds-1)`）；球差 $\le 2$ 全輸。
- **結果**：測試數量由 63 項增至 **73 項**，執行 `node tests/ah.test.js` 結果 **73 / 73 全部通過**！
- 同步更新 [`README.md`](file:///workspace/nightly/2026-10-23-beat-the-bookie/README.md) 及 [`SPEC.md`](file:///workspace/nightly/2026-10-23-beat-the-bookie/SPEC.md) 中關於單元測試涵蓋盤口之描述。

---

## 🧪 測試驗證

### 1. 單元測試
```bash
node tests/ah.test.js
```
```
--- Running Asian Handicap (settleAH) Unit Tests ---

Results: 73 / 73 tests passed.
✅ ALL ASIAN HANDICAP UNIT TESTS PASSED!
```

### 2. 端到端 CDP 瀏覽器自動化測試
```bash
node --experimental-websocket test_e2e.js
```
- **測試環境**：390px 視口寬度 Headless Chrome、純 `file://` 協議、零外網連線。
- **驗證項目**：
  1. 初盤與終盤可用場數即時切換（8,907 場 vs 11,188 場）
  2. 亞洲盤可用場數（8,908 場）
  3. 全部觸控目標（按鈕、輸入框、晶片、下拉選單）高度實測全數 $\ge 44\text{px}$
  4. 換一場功能（Reroll 按鈕與快捷鍵 `R` 換場計數、不消耗場次、揭曉後鎖定）
  5. 1X2 遊戲完整對局與精選波膽加賞
  6. 亞洲盤遊戲完整對局（讓球結算、走盤退注、勝負判定）
  7. 控制台無任何報錯：`✅ ZERO CONSOLE ERRORS!`
  8. `🎉 ALL END-TO-END AUTOMATED BROWSER TESTS PASSED PERFECTLY!`

---

## 📌 結論
Round 2 所有 Minor 項目已全數解決，所有測試 100% 通過。依使用者指示，**未執行 `git commit`**，全部變更完整保留於本地工作目錄。
