# Round 2 Review Fix Report — Beat the Bookie

已逐項審查並修正 `reviews/round-2.md` 所列出之全部 Major、Minor 及 Nit 項目。所有修改均維持純前端、離線 `file://` 安全運行、控制台 0 錯誤、繁體廣東話用詞及 `SPEC.md` 原定規格。

---

## 修正清單與說明

### 1. Major Issues

| # | 審查項目 | 修改檔案與位置 | 處理方式說明 |
|---|---|---|---|
| M1 | `game.js:907` / `game.js:296` — 第 10 場揭曉後撳 Enter/Space 跳過結算畫面並直接重開新賽季 | `game.js`, `index.html` | 1. 於 `keydown` 監聽器頂部加入 `if (e.repeat) return;`，防止按鍵長按或連發。<br>2. 於 `index.html` 為 `#verdict-text` 加上 `tabindex="-1"`；於 `showScreen(DOM.endScreen)` 將焦點轉移至勝負評判標題（`#verdict-text`），不再自動聚焦 `#replay-btn`。<br>3. 於 `showEndScreen()` 記錄畫面開啟時間戳記 `state.endScreenOpenedAt = Date.now()`。<br>4. 於全域 `keydown` 及 `#replay-btn` 點擊監聽器加入 500ms 冷卻防護（`Date.now() - state.endScreenOpenedAt < 500`），徹底避免推進第 10 場之連擊意外重開遊戲。 |

---

### 2. Minor Issues

| # | 審查項目 | 修改檔案與位置 | 處理方式說明 |
|---|---|---|---|
| m1 | `game.js:295` / `game.js:887` — 首場選擇賠率後 Enter/Space 未能直接揭曉 | `game.js` | 1. 於 `handlePick(pick)` 中加入 `DOM.revealBtn.focus();`，無論透過滑鼠點擊或鍵盤 `1`/`X`/`2` 快捷鍵下注後，焦點即時自動切換至揭曉按鈕，後續 Enter/Space 即可直接揭曉。<br>2. 於 `keydown` 監聽器中將「已選取下注項目時之賠率選項按鈕」納入主操作 CTA 判定，並加入 `targetEl.nodeType === 1` 安全節點檢查，避免 `window`/`document` 目標觸發 `closest` 異常。 |
| m2 | `style.css:937` / `style.css:989` — 賽果揭曉後波膽控制項外觀未呈現停用狀態 | `style.css` | 於 `style.css` 補齊 `:disabled` 視覺樣式：<br>• `.toggle-checkbox:disabled + .toggle-switch-visual { opacity: 0.45; cursor: not-allowed; }`<br>• `.toggle-checkbox:disabled ~ .toggle-text { opacity: 0.6; cursor: not-allowed; }`<br>• `.stepper-btn:disabled { opacity: 0.35; cursor: not-allowed; pointer-events: none; transform: none; }`<br>• `.clear-score-btn:disabled { opacity: 0.35; cursor: not-allowed; pointer-events: none; }` |
| m3 | `game.js:369` / `index.html:69` — 錯誤橫幅 `.focus()` 無效且於結算頁呼叫時藏於主頁 | `index.html`, `game.js` | 1. 於 `index.html` 為 `#start-error-banner` 加上 `tabindex="-1"`，使其具備可程式化聚焦能力。<br>2. 於 `game.js` 的 `startNewGame()` 發生錯誤時，先呼叫 `showScreen(DOM.startScreen)` 切換至主頁，再顯示橫幅並聚焦。 |
| m4 | `index.html:133` — HUD 頂部本金分隔欄仍殘留英文「VS」 | `index.html` | 將 `<div class="hud-vs-divider">VS</div>` 替換為地道用詞 `<div class="hud-vs-divider">對賽</div>`，與球場卡片中央徽章保持一致。 |

---

### 3. Nits (細節優化)

| # | 審查項目 | 修改檔案與位置 | 處理方式說明 |
|---|---|---|---|
| n1 | `game.js:818` / `game.js:837` — 波膽空白狀態下首次點擊加號設為 1 而非 0 | `game.js` | 修正 Stepper 點擊邏輯：從 `null` 狀態首次點擊不論 `+` 或 `-`，皆初始化為 `0`（再次點擊 `+` 則遞增至 `1`），確保 `0` 球可透過加減雙向自然觸達。 |
| n2 | `game.js:855` — `#home-btn` 存在多餘的 keydown 監聽器 | `game.js` | 移除多餘的 `homeBtn.addEventListener('keydown', ...)`，交由原生 HTML `<button>` 處理 Enter/Space 之標準點擊事件。 |
| n3 | `index.html:6` / `index.html:19` — 標題/副標題仍保留 `Beat the Bookie` | `index.html` | 作為雙語品牌名稱保留，其餘所有介面 Chrome 之非必要英文均已清除。 |

---

## 4. 自動化測試驗證

使用無頭 Chrome 經由 CDP 執行全流程驗證腳本（`verify_round2_fixes.js`）：
- 測試環境：Viewport 360×800，`file:///workspace/nightly/2026-10-23-beat-the-bookie/index.html`
- 驗證重點與結果：
  - HUD 本金比較欄分隔符號為「對賽」：✅ 通過
  - 鍵盤按下 `1` 後直接按 Enter 成功揭曉賽果（無需額外 Tab）：✅ 通過
  - 揭曉後波膽 Switch 視覺不透明度為 0.45、加號按鈕為 0.35：✅ 通過
  - 波膽空白狀態下首次點擊加號數值為 `0`，再次點擊為 `1`：✅ 通過
  - 完成第 10 場後連續觸發 Enter、Space、KeyRepeat 及即時點擊 Replay，結算畫面維持開啟未被跳過：✅ 通過
  - 冷卻 500ms 後再玩一轉按鈕功能完全正常：✅ 通過
  - 錯誤提示橫幅 `tabindex="-1"` 聚焦正常：✅ 通過
  - 瀏覽器 Console Log 監控：**0 error, 0 warning**
