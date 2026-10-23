# Beat the Bookie v2 — Round 1 Fix Report

對應 `reviews/v2-round-1.md` 所列出之全部 Major 及 Minor 項目進行全數修復與測試驗證。修復過程嚴格遵循「保持數據真實、不捏造數據、離線雙擊運行、Authentic 廣東話 UI、觸控目標 ≥ 44px、不執行 git commit」之原則。

---

## 📋 修正清單與實作詳情

### 一、Major 項目修正

#### 1. 初盤模式剔除無初盤場次、更新即時場數與說明提示 (Major 1)
- **問題**：先前初盤模式在主客和 (1X2) 下仍包含 2,280 場無初盤賠率之歐洲賽（及 1 場意甲無初盤場次），結算及走勢退回終盤賠率；且 `updateLivePoolCount()` 未連動 `state.oddsType`，即時可用場數未扣除無初盤場次。
- **修正**：
  1. **元數據升級**：[`build_data.py`](file:///workspace/nightly/2026-10-23-beat-the-bookie/build_data.py) 生成 `BTB_META.counts` 時，細分記錄每個賽事與賽季之 `total`、`ah`、`open1x2`、`close1x2`、`openAH`、`closeAH`。
  2. **即時場數連動**：[`game.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/game.js) 的 `updateLivePoolCount()` 同步讀取 `state.oddsType` 與 `state.betMode`：
     - **主客和初盤**：可用場數精準計算為 **8,907 場**（11,188 場總數扣除 2,280 場無初盤歐洲賽及 1 場無初盤意甲比賽）；
     - **主客和終盤**：可用場數為 **11,188 場**；
     - **亞洲盤初盤**：可用場數為 **8,902 場**（扣除無初盤讓球數據之場次）；
     - **亞洲盤終盤**：可用場數為 **8,908 場**。
  3. **開波賽事池精準過濾**：`startNewGame()` 嚴格要求所選賠率類型（初盤必須具備 `open1X2` 或 `openAH`），絕不退回終盤賠率，歐洲盃賽在初盤模式下完全不入池。
  4. **嚴格結算與盤面渲染**：`render1X2Board()`、`renderAHBoard()` 與 `revealCurrentRound()` 統一依 `state.oddsType === 'opening' ? match.open1X2 : match.close1X2` 取值，不作跨盤口類型 fallback。
  5. **盃賽提示動態更新**：新增 `refreshCupOddsNote()` 函數，於任何賽事晶片/快速鍵切換、玩法模式切換、盤口類型切換時即時觸發：
     - 若勾選歐洲賽且處於初盤模式，提示「💡 歐洲賽事（歐聯/歐霸/歐協聯）無初盤賠率，初盤模式下將不包含歐洲賽。」；
     - 若處於終盤模式，提示「💡 歐洲賽事（歐聯/歐霸/歐協聯）只有終盤 1X2 賠率，不設初盤及亞洲讓球盤。」；
     - 若未勾選歐洲賽，自動隱藏提示。

#### 2. 自訂初始本金選項 (Major 2)
- **問題**：先前主頁面文案註明「自訂初始本金」，但設定介面未提供本金選項晶片，本金固定為 100 注。
- **修正**：
  1. 在 [`index.html`](file:///workspace/nightly/2026-10-23-beat-the-bookie/index.html) 新增「💰 初始本金」設定區塊，提供預設選項晶片：`50 注`、`100 注`（預設）、`200 注`、`自訂`，以及自訂數字輸入框 `#custom-bankroll-wrap`。
  2. 桌面端與每注注碼並排於 `.setup-row-dual`，移動端（≤600px）自動垂直堆疊。
  3. [`game.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/game.js) 綁定本金晶片與輸入框監聽器，連動 `state.startingBankroll`；於 `startNewGame()` 時將玩家及 AI 本金重設為 `state.startingBankroll`，並用於戰報頁 ROI 計算。

#### 3. 390px 移動端觸控目標全面 ≥ 44px (Major 3)
- **問題**：`.stepper-btn` 在桌面為 34px，在 `@media (max-width: 420px)` 下更縮至 38px；自訂輸入框、日期輸入框等高度低於 44px。
- **修正**：
  1. [`style.css`](file:///workspace/nightly/2026-10-23-beat-the-bookie/style.css) 將 `.stepper-btn` 全局及 `@media (max-width: 420px)` 均設為 `width: 44px; height: 44px; min-width: 44px; min-height: 44px;`。
  2. `.custom-input-wrap input` 設為 `min-height: 44px;`。
  3. `.date-input` 設為 `min-height: 44px;`。
  4. `.filter-input, .filter-select` 設為 `min-height: 44px;`。
  5. `.btn-text-action`（重設進階篩選）設為 `min-height: 44px; display: inline-flex; align-items: center;`。
  6. `.quick-btn`（全選/五大聯賽/歐洲賽）設為 `min-height: 44px; display: inline-flex; align-items: center;`。
  7. `.clear-score-btn` 設為 `min-height: 44px; display: inline-flex; align-items: center;`。
  8. 通過 CDP 自動化測試驗證：在 390px 視口寬度下，全部互動觸控目標實測高度均 $\ge 44\text{px}$。

---

### 二、Minor 項目修正

#### 1. 擴充亞洲盤單元測試覆蓋度 (Minor 1)
- **修正**：在 [`tests/ah.test.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/tests/ah.test.js) 補充以下測試家族：
  - `+1.5` 盤口（贏/輸判定）
  - `-2.0` 盤口（贏/走盤/輸判定）
  - `+1.75` 盤口（分拆 +1.5/+2.0，贏/輸半/輸全判定）
  - `-1.75` 盤口（分拆 -1.5/-2.0，贏全/贏半/輸全判定）
  - `+2.25` 盤口（分拆 +2.0/+2.5，贏全/贏半/輸全判定）
  - `-2.25` 盤口（分拆 -2.0/-2.5，贏全/輸半/輸全判定）
  - 非 10 注碼測試（注碼 5, 25, 50 之整數與小數盈虧四捨五入）
  - 平手盤等額賠率（odds = 2.00）各結算狀態測試
  - 非分盤恆等性測試（單盤口分拆兩半注碼結算等同全盤，無漏算或雙重計算）
  - 窮舉校驗測試（橫跨 -3.0 至 +3.0 共 25 個讓球盤口與 -10 至 +10 共 21 個整數球差，斷言 `outcome !== 'unknown'`，證明整數球差下不可能出現 unknown）
- **結果**：測試數量由 40 項擴充至 **63 項**，`node tests/ah.test.js` 執行結果 **63 / 63 全部通過**！

#### 2. 跳過無 1X2 賠率之盃賽與聯賽數據行 (Minor 2)
- **修正**：在 [`build_data.py`](file:///workspace/nightly/2026-10-23-beat-the-bookie/build_data.py) 的 `process_cup()` 中加入 `if c1x2_h is None or c1x2_d is None or c1x2_a is None or c1x2_h <= 0 or c1x2_d <= 0 or c1x2_a <= 0: continue`；聯賽 `process_league()` 亦加入完整 1X2 數據檢驗。

#### 3. 修正 meta 大小累計錯誤 (Minor 3)
- **修正**：[`build_data.py`](file:///workspace/nightly/2026-10-23-beat-the-bookie/build_data.py) 第 429 行原為 `total_bytes += sz`（重複累加最後一個盃賽檔案大小），修正為 `total_bytes += meta_sz`。重新生成後實際總大小由先前誤報的 1,365.6 KB (1.33 MB) 更正為精確的 **1,295.5 KB (1.27 MB)**，完全符合 < 1.5 MB 規範。

#### 4. `<script>` 載入失敗重試與逾時保護 (Minor 4)
- **修正**：在 [`game.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/game.js) 中將簡單 Set 改造為 `scriptLoadPromises` Map；於載入時加入 10 秒逾時中斷，且於 `onerror` 或逾時發生時，清除 Map 記錄並移除 DOM 節點，允許後續再次點擊時能乾淨重新發起載入，杜絕無窮輪詢。

#### 5. 球會代表色套用修正 (Minor 5)
- **修正**：在 [`game.js`](file:///workspace/nightly/2026-10-23-beat-the-bookie/game.js) 的 `getTeamColors(teamName, enName)` 中，優先查詢 `enName && CLUB_PALETTES[enName]`；使阿仙奴（紅白）、利物浦（紅紅）、曼聯（紅黑）、車路士（藍白）、曼城（天藍白）、皇馬（白金）、巴塞隆拿（藍紅）、拜仁（紅白）等豪門能正確套用專屬隊色隊徽 SVG。

#### 6. 正宗廣東話文字細節統一 (Minor 6)
- **修正**：
  - [`index.html`](file:///workspace/nightly/2026-10-23-beat-the-bookie/index.html)「初盤 vs 終盤走勢」更正為「初盤到終盤走勢」。
  - 「不猜波膽」更正為正宗粵語「唔估波膽」。
  - 下拉選單「全部球隊（不限）」更正為「全部球隊（唔限）」。
  - 場數不足警告「可用比賽不足，請調整篩選！」更正為「可用比賽唔夠，請調整篩選！」。

#### 7. 聯賽僅初盤/僅終盤數據行保證不跨盤口回退 (Minor 7)
- **修正**：經由上述開波池過濾與直接引用，保證在初盤模式下絕不讀取或結算終盤數據，反之亦然。

---

## 🧪 測試驗證結果

### 1. 單元測試 (`node tests/ah.test.js`)
```
--- Running Asian Handicap (settleAH) Unit Tests ---

Results: 63 / 63 tests passed.
✅ ALL ASIAN HANDICAP UNIT TESTS PASSED!
```

### 2. CDP 端到端自動化測試 (`node --experimental-websocket test_e2e.js`)
在 390px 視口寬度（iPhone Safari 標準）下啟動 Headless Chrome 進行無外網、本機 `file://` 端到端測試：
1. **即時場數與盤口切換**：
   - 預設（主客和終盤）：`11,188` 場
   - 切換主客和初盤：即時更新為 `8,907` 場，盃賽註明「歐洲賽事無初盤賠率，初盤模式下將不包含歐洲賽。」
   - 切換亞洲盤：即時更新為 `8,908` 場
   - 阿仙奴進階篩選：即時過濾出 190 場聯賽亞洲盤
2. **觸控目標尺寸實測（390px 視口）**：
   - `customInput`: 44px
   - `dateInput`: 44px
   - `clearAdvanced`: 44px
   - `quickBtn`: 44px
   - `chipBtn`: 44px
   - `segmentBtn`: 44px
   - `stepperBtn`: 44px
   - `clearScoreBtn`: 44px
   - 全部 $\ge 44\text{px}$ 達標。
3. **主客和完整對局（含換一場、波膽加賞、結算戰報）**：全部正常運作。
4. **亞洲盤完整對局（讓一球走盤退注、勝負結算）**：全部正常運作。
5. **Console 報錯檢測**：`✅ ZERO CONSOLE ERRORS!`。

---

## 📊 檔案大小與賽事統計總表

```
================================================================================
Beat the Bookie v2 - 數據生成報告 (Data Generation Report)
================================================================================

【比賽場數統計 (Match Counts per Competition & Season)】
--------------------------------------------------------------------------------------
賽事 (Comp)        | 2021/22 | 2022/23 | 2023/24 | 2024/25 | 2025/26 |     總場數 |    AH場數
--------------------------------------------------------------------------------------
英超 (epl)         |     380 |     380 |     380 |     380 |     380 |    1900 |    1900
西甲 (laliga)      |     380 |     380 |     380 |     380 |     380 |    1900 |    1900
意甲 (seriea)      |     380 |     380 |     380 |     380 |     380 |    1900 |    1900
德甲 (bundesliga)  |     306 |     306 |     306 |     306 |     306 |    1530 |    1530
法甲 (ligue1)      |     380 |     380 |     306 |     306 |     306 |    1678 |    1678
歐聯 (ucl)         |     125 |     125 |     125 |     189 |     189 |     753 |     N/A
歐霸 (uel)         |     139 |     141 |     141 |     189 |     189 |     799 |     N/A
歐協聯 (uecl)       |     140 |     141 |     141 |     153 |     153 |     728 |     N/A
--------------------------------------------------------------------------------------
總計 (Total)       |    2230 |    2233 |    2159 |    2283 |    2283 |   11188 |    8908
--------------------------------------------------------------------------------------

【生成檔案大小 (Generated File Sizes)】
檔案 (File)            | 賽事名稱 (Competition)     |     球隊數 |     比賽數 |    大小 (KB)
---------------------------------------------------------------------------
data/epl.js          | 英超 (epl)               |      27 |    1900 |     212.8 KB
data/laliga.js       | 西甲 (laliga)            |      26 |    1900 |     212.6 KB
data/seriea.js       | 意甲 (seriea)            |      27 |    1900 |     212.4 KB
data/bundesliga.js   | 德甲 (bundesliga)        |      25 |    1530 |     171.6 KB
data/ligue1.js       | 法甲 (ligue1)            |      25 |    1678 |     187.8 KB
data/ucl.js          | 歐聯 (ucl)               |      72 |     753 |      90.3 KB
data/uel.js          | 歐霸 (uel)               |     106 |     799 |      97.2 KB
data/uecl.js         | 歐協聯 (uecl)             |     135 |     728 |      90.4 KB
data/meta.js         | 元數據 (meta.js)          |     277 |   11188 |      20.3 KB
---------------------------------------------------------------------------
全部檔案總大小 (Total Raw Size): 1295.5 KB (1.27 MB)
目標上限 (Target Limit): 1.50 MB -> 符合標準: ✅ 通過
================================================================================
```

---

## 📌 結論
所有在 `reviews/v2-round-1.md` 所列之 Major 及 Minor 項目已全部修正並通過自動化單元測試與 CDP 瀏覽器測試。**未執行 `git commit`**，全部修改完整保留於本地工作目錄。
