# Beat the Bookie v2 — Verdict Minor Fixes Report

依據 `reviews/v2-verdict-grok.md` 所列之 4 項 Minor 項目進行全面修正與測試驗證。依指示保持數據真實性、**絕不執行 `git commit`**。

---

## 📋 4 項 Minor 項目修正清單與實作詳情

### 1. `README.md` / `SPEC.md` 文件舊名與舊勝負文案修正 (Minor 1)
- **問題**：遊戲介面已完成正名為「電腦對手（次次跟熱門）」及新判定文案（「輸給莊家」/「打和 / 保本」），但 [`README.md`](file:///workspace/nightly/2026-10-23-beat-the-bookie/README.md) 及 [`SPEC.md`](file:///workspace/nightly/2026-10-23-beat-the-bookie/SPEC.md) 中仍殘留「對抗跟莊熱門 AI」、「AI 對手同步換至相同新比賽」、「輸咗畀莊家」等舊稱呼，且終局描述仍寫每次完場皆「刷新 localStorage 最高紀錄」。
- **修正**：
  1. [`README.md`](file:///workspace/nightly/2026-10-23-beat-the-bookie/README.md)：
     - 將換場說明中的 `AI 對手` 更新為 `電腦對手`；
     - 將段落標題由 `對抗跟莊熱門 AI` 修正為 `同場「電腦對手（次次跟熱門）」`，並註明電腦對手盲買熱門，與玩家一齊同莊家對賭；
     - 終局戰報勝負判定更新為 **🏆 贏咗莊家！ / 📉 輸給莊家 / 🤝 打和 / 保本**，明確標註主標題只按玩家自己淨盈虧決定；
     - 補充獨立副標題、莊家淨盈虧橫幅與 House 定位說明；
     - 註明只有在錄得盈利且超越歷史最佳時才會刷新 `localStorage` 最高紀錄；
     - 更新單元測試章節，列出 `node tests/ah.test.js`（74 項）與 `node tests/verdict.test.js`（13 項）。
  2. [`SPEC.md`](file:///workspace/nightly/2026-10-23-beat-the-bookie/SPEC.md)：
     - 將換場與對手章節統一更新為 `同場「電腦對手（次次跟熱門）」(Baseline Bettor)`；
     - 終局戰報章節同步更新判定標題與副標題規格，明訂主標題僅由玩家對莊家淨盈虧判定。

---

### 2. `getBestScore` 忽略並清理 $\le$ 起始本金之舊紀錄 (Minor 2)
- **問題**：舊版儲存邏輯在首局虧損（如 96.4）時會將其寫入 `localStorage` 的 `btb_best_v2`。雖然修訂後的 `saveBestScore` 已限制 `score > startingBankroll`，但 `getBestScore()` 先前未檢查門檻，曾儲存舊虧損分數之裝置在主頁面及終局卡仍會讀出 `96.4` 作為歷史最高紀錄。
- **修正**：
  1. 在 [`game.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/game.js) 中重構 `getBestScore(startingBankroll)`：
     ```javascript
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
       } catch (e) {}
       return null;
     }
     ```
  2. 凡讀取到 $\le \text{threshold}$ 之數值，直接回傳 `null` 並自動自 `localStorage` 移除過期無效記錄，確保舊裝置徹底回歸「暫無紀錄 / 暫無盈利紀錄」。
  3. 主頁面初始本金選項（50 / 100 / 200 / 自訂）切換時，自動呼叫 `updateStartScreenBestScore()` 動態刷新門檻檢查。
  4. 終局戰報呼叫 `getBestScore(initial)` 與 `saveBestScore(playerFinal, initial)` 時傳入當局起始本金。

---

### 3. `game.js` Inline Fallback 補充 0.1 四捨五入、副標題與莊家行 (Minor 3)
- **問題**：若 `window.calculateVerdict` 缺失，舊版 inline fallback 物件略過 0.1 四捨五入（導致如 100.04 判定為贏而非打和），且副標題 `subtitle`、莊家橫幅 `bookiePnlText` 與 `detail` 全數為空字串。
- **修正**：
  - 在 [`game.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/game.js) 的 `showEndScreen()` 健全化 inline fallback 邏輯：
    1. 同步執行 `(Math.round((val) * 10) / 10) || 0`，精確消除浮點誤差與 `-0`；
    2. 完整實作 9 種勝負組合對應之副標題（「仲贏埋電腦對手 X 注」、「但你贏咗電腦對手 X 注」、「但電腦對手贏你 X 注」、「同電腦對手打和」等）；
    3. 完整生成莊家盈虧文案（「莊家今局喺你身上贏咗 X 注」/「你今局贏咗莊家 X 注」/「今局同莊家打和（保本不失）」）與廣東話安慰/讚揚文字；
    4. 確保無論模組載入狀態如何，終局介面元素均完備展示，絕不留白。

---

### 4. `test_e2e.js` 截圖目錄指向 `screenshots/v2-390` 並刷新所有截圖 (Minor 4)
- **問題**：先前 `SCREENSHOTS_DIR` 指向根目錄 `screenshots/`，僅個別測試寫入 `screenshots/v2-390/`，導致 `screenshots/v2-390/` 中的常態截圖停留在舊版畫面。
- **修正**：
  1. 在 [`test_e2e.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/test_e2e.js) 中將 `SCREENSHOTS_DIR` 統一設為 `path.resolve(__dirname, 'screenshots/v2-390')`，所有截圖均自動收錄至 `screenshots/v2-390/`。
  2. 擴展新增 `Test 7`：自動注入 $\le 100$ 的舊虧損數值（`96.4`）至 `localStorage`，驗證 `getBestScore(100)` 確實忽略並自儲存庫清理；再驗證 $> 100$ 之有效盈利分數正常回傳。
  3. 重新執行完整端到端測試，全數刷新 `screenshots/v2-390/` 之截圖檔案：
     - `test_game_1x2_round1.png`（新 HUD：電腦對手（次次跟熱門））
     - `test_game_1x2_revealed.png`（新揭曉：🤖 電腦對手（次次跟熱門）結算）
     - `test_end_screen.png`（新終局：含主副標題、莊家盈虧欄及說明）
     - `test_game_ah_round1.png`
     - `test_game_ah_revealed.png`
     - `test_end_screen_loss.png`（Penny Bug 輸錢終局驗證畫面）

---

## 🧪 測試驗證全數通過

### 1. 亞洲盤單元測試 (`node tests/ah.test.js`)
```
--- Running Asian Handicap (settleAH) Unit Tests ---

Results: 74 / 74 tests passed.
✅ ALL ASIAN HANDICAP UNIT TESTS PASSED!
```

### 2. 終局判定單元測試 (`node tests/verdict.test.js`)
```
--- Running Verdict (calculateVerdict) Unit Tests ---

Results: 13 / 13 tests passed.
✅ ALL VERDICT UNIT TESTS PASSED!
```

### 3. 端到端 Chrome DevTools Protocol 瀏覽器測試 (`node --experimental-websocket test_e2e.js`)
```
--- Launching Headless Chrome ---
Connecting to Chrome DevTools Protocol...
WebSocket Debug URL: ws://127.0.0.1:9222/devtools/page/...

--- Test 1: Start Screen Initial State & Live Match Count ---
Initial live pool count text: 11,188
Start button disabled: false

--- Test 1b: Verify Touch Targets >= 44px on 390px Viewport ---
Touch target heights (px): {
  customInput: 44,
  dateInput: 44,
  clearAdvanced: 44,
  quickBtn: 44,
  chipBtn: 44,
  segmentBtn: 44
}

--- Test 1c: Check Live Pool Count on Opening vs Closing Odds Mode ---
Opening odds live pool count: 8,907
Cup note display: block text: 💡 歐洲賽事（歐聯/歐霸/歐協聯）無初盤賠率，初盤模式下將不包含歐洲賽。
Closing odds live pool count: 11,188

--- Test 1d: Custom Starting Bankroll Selection ---

--- Test 2: Switch Bet Mode to Asian Handicap (AH) ---
AH mode live pool count: 8,908

--- Test 3: Advanced Filter Team Selection ---
Arsenal matches in AH pool: 190

--- Test 4: Play 5-Round 1X2 Game with Exact Score Guess ---
Game screen active: true
📸 Saved screenshot: screenshots/v2-390/test_game_1x2_round1.png
Round 1 HUD: 第 1 / 5 場

--- Testing Reroll (換一場) ---
Initial reroll count pill: 已換 0 次
Before reroll match: 哈化柏林 vs 禾夫斯堡
After reroll 1 match: 韋斯咸 vs 法蘭克福, pill: 已換 1 次
After keyboard R reroll pill: 已換 2 次
Stepper button height: 44px, Clear score button height: 44px
Round 1 result card visible: true
Reroll button disabled after reveal: true
📸 Saved screenshot: screenshots/v2-390/test_game_1x2_revealed.png
End screen active: true
End Screen Verdict: "輸給莊家", Final Bankroll: "50.0 注", Recap Items: 5, End Rerolls: "2 次"
📸 Saved screenshot: screenshots/v2-390/test_end_screen.png

--- Test 5: Play 5-Round Asian Handicap (AH) Game ---
AH Game screen active: true
AH Board display: grid, 1X2 Board display: none
AH Lines: Home: "平手 (0)", Away: "平手 (0)"
📸 Saved screenshot: screenshots/v2-390/test_game_ah_round1.png
AH Round 1 Result Main Text: 贏足全盤！ 獲利 +7.0 注
📸 Saved screenshot: screenshots/v2-390/test_game_ah_revealed.png
AH End screen active: true
AH End Screen Verdict: 贏咗莊家！

--- Test 6: Verify End Screen Loss Verdict & Penny Bug Scenario ---
Loss Verdict Title: 輸給莊家
Loss Verdict Subtitle: 但你贏咗電腦對手 1.8 注
Loss Bookie PnL: 莊家今局喺你身上贏咗 3.6 注
Loss Banner Class: verdict-banner loss
📸 Saved screenshot: screenshots/v2-390/test_end_screen_loss.png

--- Test 7: Verify getBestScore ignores and purges losing records (<= startingBankroll) ---
✅ getBestScore correctly ignored and purged stale losing record!

--- Checking for Console Errors ---
✅ ZERO CONSOLE ERRORS!

🎉 ALL END-TO-END AUTOMATED BROWSER TESTS PASSED PERFECTLY!
```
