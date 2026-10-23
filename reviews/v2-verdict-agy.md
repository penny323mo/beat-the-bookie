# Beat the Bookie v2 — Verdict Bug Fix 報告

針對 iPhone 實測發現之重大邏輯 Bug（Penny 測試案例：玩家最終本金 96.4、起始 100、淨損 -3.6 注；電腦對手 94.6，終局畫面仍誤判為「贏咗莊家！」並顯示讚揚文字）進行全面根治與架構重構。

所有修改均已嚴格遵循：不執行 `git commit`、真實數據不造假、純前端離線 `file://` 安全相容、iPhone 390px 觸控友善（點擊目標 $\ge 44\text{px}$）以及全繁體廣東話（香港常用地道語意）。

---

## 🐞 問題根源分析 (Root Cause)

1. **勝負主體對象混淆**：舊版 `game.js` 的 `renderEndScreen()` 先前以 `playerFinal > baselineFinal` 作為勝負判斷條件。當玩家輸錢（96.4 < 100）但電腦對手輸得更多（94.6）時，系統將「玩家贏過盲跟熱門對手」誤當成「贏咗莊家」。
2. **角色定位模糊**：玩家容易將「電腦對手」的本金卡誤認為「莊家金庫」，不清楚莊家是抽水開盤的 House，而電腦對手本質上亦是賭客。
3. **最高紀錄防護缺失**：舊版首局結束若錄得虧損（如 96.4），由於本機無舊紀錄，會將 96.4 當作最高分儲存並顯示「🎉 刷新個人最高紀錄！」，與虧損狀態矛盾。

---

## 🛠️ 修正實作清單與架構調整

### 1. 抽取純函數模組 [`verdict.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/verdict.js)
- 零依賴純函數 `calculateVerdict(playerFinal, baselineFinal, startingBankroll = 100)`，同時代理物件引數模式 `calculateVerdict({ playerFinal, baselineFinal, startingBankroll })`。
- 採用 `Number.isFinite` 嚴格參數檢驗。
- 淨值四捨五入至小數點後 1 位 `(Math.round(val * 10) / 10) || 0`，徹底消除浮點精度誤差（如 `-0.000000001`）及 JavaScript `-0` 陷阱。
- 納入 [`.vercelignore`](file:///workspace/nightly/2026-10-23-beat-the-bookie/.vercelignore) 白名單（`!verdict.js`），並於 [`index.html`](file:///workspace/nightly/2026-10-23-beat-the-bookie/index.html) 在 `game.js` 之前載入。

### 2. 主標題僅由玩家對莊家淨盈虧決定
- **淨盈虧 > 0**：主標題「**贏咗莊家！**」，樣式 `.verdict-banner.win`，獎盃 `🏆`。
- **淨盈虧 < 0**：主標題「**輸給莊家**」，樣式 `.verdict-banner.loss`（醒目紅色系），獎盃 `📉`。
- **淨盈虧 == 0**：主標題「**打和 / 保本**」，樣式 `.verdict-banner.draw`（中性灰），獎盃 `🤝`。
- 讚揚與安慰詳細文字（`verdict-detail`）與勝負狀態嚴密對應。

### 3. 電腦對手結果獨立副標題 (`#verdict-subtitle`)
獨立比較玩家與電腦對手之本金差額，組合所有可能性文字，句式流暢地道：
- **贏莊家時**：
  - 比電腦多：`仲贏埋電腦對手 X 注`
  - 比電腦少：`但電腦對手贏你 X 注`
  - 與電腦平：`同電腦對手打和`
- **輸給莊家時**：
  - 比電腦多：`但你贏咗電腦對手 X 注`（*Penny 案例精準命中*：96.4 vs 94.6 顯示「輸給莊家」配「但你贏咗電腦對手 1.8 注」）
  - 比電腦少：`電腦對手贏你 X 注`
  - 與電腦平：`同電腦對手打和`
- **保本打和時**：
  - 比電腦多：`兼且贏咗電腦對手 X 注`
  - 比電腦少：`但電腦對手贏你 X 注`
  - 與電腦平：`同電腦對手打和`

### 4. 角色正名與莊家 House 盈虧專欄
- 全站文案統一更名為「**電腦對手（次次跟熱門）**」（包含玩法介紹、規則說明、比賽中上方 HUD 標籤、揭曉結算比較欄、終局數據卡）。
- 終局畫面加入專屬莊家盈虧橫幅 [`#bookie-pnl-banner`](file:///workspace/nightly/2026-10-23-beat-the-bookie/index.html)：
  - 玩家輸：`莊家今局喺你身上贏咗 X 注`（樣式 `.loss`）
  - 玩家贏：`你今局贏咗莊家 X 注`（樣式 `.win`）
  - 打和：`今局同莊家打和（保本不失）`（樣式 `.draw`）
- 終局畫面常駐補充說明卡：
  > 💡 說明：莊家係開盤抽水嘅 House，你同電腦對手都係賭客，一齊同莊家對賭。

### 5. 最佳紀錄與 ROI 邏輯合理化
- 修正 [`game.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/game.js) 中的 `saveBestScore(score, startingBankroll)`：只有在 `score > startingBankroll`（即確有盈利）且超越歷史最佳紀錄時，才寫入本機儲存並慶祝「🎉 刷新個人最高紀錄！」。
- 玩家首局若錄得虧損，終局卡顯示「暫無盈利紀錄」，次標顯示「今局未達盈利門檻」，不再誤報破紀錄。

---

## 🧪 測試套件驗證結果

### 1. 亞盤結算單元測試
```bash
node tests/ah.test.js
```
```
--- Running Asian Handicap (settleAH) Unit Tests ---

Results: 74 / 74 tests passed.
✅ ALL ASIAN HANDICAP UNIT TESTS PASSED!
```

### 2. 終局評判邏輯單元測試 [`tests/verdict.test.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/tests/verdict.test.js)
```bash
node tests/verdict.test.js
```
```
--- Running Verdict (calculateVerdict) Unit Tests ---

Results: 13 / 13 tests passed.
✅ ALL VERDICT UNIT TESTS PASSED!
```
覆蓋範圍：
- Combo 1: 贏莊家 × 贏電腦
- Combo 2: 贏莊家 × 輸電腦
- Combo 3: 輸莊家 × 贏電腦（**Penny Bug 測試：96.4 vs 94.6，起始 100**）
- Combo 4: 輸莊家 × 輸電腦
- 保本打和與各種對手差額（贏/輸/雙平）
- 自訂初始本金（50、200 注）
- 浮點微差 tolerance（0.04 不進位、0.06 準確進位）
- `TypeError` 非法輸入檢驗

### 3. 端到端 Chrome DevTools Protocol (CDP) 瀏覽器自動化測試 [`test_e2e.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/test_e2e.js)
```bash
node --experimental-websocket test_e2e.js
```
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
📸 Saved screenshot: test_game_1x2_round1.png
Round 1 HUD: 第 1 / 5 場

--- Testing Reroll (換一場) ---
Initial reroll count pill: 已換 0 次
Before reroll match: 奧格斯堡 vs 海登咸
After reroll 1 match: 鴨巴甸 vs 諾亞FC, pill: 已換 1 次
After keyboard R reroll pill: 已換 2 次
Stepper button height: 44px, Clear score button height: 44px
Round 1 result card visible: true
Reroll button disabled after reveal: true
📸 Saved screenshot: test_game_1x2_revealed.png
End screen active: true
End Screen Verdict: "輸給莊家", Final Bankroll: "50.0 注", Recap Items: 5, End Rerolls: "2 次"
📸 Saved screenshot: test_end_screen.png

--- Test 5: Play 5-Round Asian Handicap (AH) Game ---
AH Game screen active: true
AH Board display: grid, 1X2 Board display: none
AH Lines: Home: "讓球半/兩球 (-1.75)", Away: "受讓球半/兩球 (+1.75)"
📸 Saved screenshot: test_game_ah_round1.png
AH Round 1 Result Main Text: 全輸！ 獲利 -10.0 注
📸 Saved screenshot: test_game_ah_revealed.png
AH End screen active: true
AH End Screen Verdict: 贏咗莊家！

--- Test 6: Verify End Screen Loss Verdict & Penny Bug Scenario ---
Loss Verdict Title: 輸給莊家
Loss Verdict Subtitle: 但你贏咗電腦對手 1.8 注
Loss Bookie PnL: 莊家今局喺你身上贏咗 3.6 注
Loss Banner Class: verdict-banner loss
📸 Saved screenshot: screenshots/v2-390/test_end_screen_loss.png

--- Checking for Console Errors ---
✅ ZERO CONSOLE ERRORS!

🎉 ALL END-TO-END AUTOMATED BROWSER TESTS PASSED PERFECTLY!
```

---

## 📷 產出截圖

- **iPhone 390px 輸錢終局畫面截圖**：[`screenshots/v2-390/test_end_screen_loss.png`](file:///workspace/nightly/2026-10-23-beat-the-bookie/screenshots/v2-390/test_end_screen_loss.png)
  - 清楚展示紅底橫幅「**輸給莊家**」、副標題「**但你贏咗電腦對手 1.8 注**」、莊家盈虧欄「**🏦 莊家今局喺你身上贏咗 3.6 注**」以及說明字句，徹底杜絕角色認知混淆。
