# Beat the Bookie v2 — Round 2 Review

Read-only review against `prompts/v2-round-0-agy-build.txt`, `prompts/v2-round-0b-agy-reroll.txt`, round-0/1 reports, and `reviews/v2-round-1.md`. Source was not modified.

**Method:** re-read `ah.js`, `tests/ah.test.js`, `build_data.py`, `game.js`, `index.html`, `style.css`, `.vercelignore`, `data/*.js`; ran `node tests/ah.test.js` (63/63 pass); summed `BTB_META.counts` against every compact array; re-sampled EPL/Serie A/UCL tuples vs CSV/JSON.

---

## Round-1 follow-up

| Round-1 item | Status |
| :--- | :--- |
| M1 初盤仍派歐洲賽／無初盤列，結算 silently 用終盤 | **Fixed.** `startNewGame` (`game.js:1006-1012`) and both live-count paths require `open1X2` / `openAH` when `oddsType === 'opening'`. Render/settle use `match.open1X2` / `match.openAH` with no closing fallback (`game.js:1193`, `1256`, `1419`, `1454`). Meta now stores `open1x2`/`openAH`/`close1x2`/`closeAH`. Default 1X2 初盤 count = **8,907**; AH 初盤 = **8,902**; 1X2 終盤 = **11,188**; AH 終盤 = **8,908**. `refreshCupOddsNote()` (`game.js:647-664`) runs on comp / mode / odds-type changes. |
| M2 無自訂初始本金 | **Fixed.** Chips 50/100/200+custom (`index.html:164-176`); `state.startingBankroll` wired (`game.js:875-899`); ROI uses it (`game.js:1611`). |
| M3 390px stepper &lt; 44px | **Fixed.** `.stepper-btn` is 44×44 globally and in `@media (max-width: 420px)` (`style.css:1559-1563`, `2019-2023`). Custom/date/filter inputs, `.quick-btn`, `.btn-text-action`, `.clear-score-btn` also `min-height: 44px`. |
| m1 AH tests extra families | **Fixed.** 40 → **63** tests; `+1.5`, `-2`, `±1.75`, `±2.25`, stakes 5/25/50, odds 2.00, non-quarter identity, exhaustive `unknown` ban. Expected values checked (e.g. stake 5 halfwin at 1.95 → 2.38). |
| m2 盃賽無 1X2 仍入庫 | **Fixed.** `process_cup` skips incomplete 1X2 (`build_data.py:318-319`); leagues skip rows with neither open nor close 1X2 (`build_data.py:200-202`). Current dumps: unmatched cup odds = 0. |
| m3 `total_bytes += sz` | **Fixed.** `total_bytes += meta_sz` (`build_data.py:429`). Actual `data/` = **1,295.5 KB (1.27 MB)**. |
| m4 script 404 hang | **Fixed.** `scriptLoadPromises` Map, 10s timeout, `onerror`/timeout delete the entry and drop the node (`game.js:228-271`). |
| m5 隊徽 palette 用粵語名 | **Fixed.** `getTeamColors` looks up `enName` first (`game.js:81-88`). |
| m6 `vs` / `不猜` / `不限` | **Fixed.** 「初盤到終盤走勢」, 「唔估波膽」, 「全部球隊（唔限）」, 「可用比賽唔夠」. |
| m7 初盤不得回退終盤 | **Fixed.** Same as M1; Torino–Fiorentina 10/01/2022 remains in the file with null opening (CSV really blank) and is excluded from the 初盤 pool. |

No round-1 regression on AH math, CSV mapping, reroll, lazy `<script>` load, or Cantonese team names (0/277 unmapped).

---

## Critical

_None._

---

## Major

_None._ Round-1 majors are implemented and the live meta counts match the compact arrays.

---

## Minor

1. **`README.md:106` — leftover size figure.** The v2 highlights block correctly says 1.27 MB (`README.md:25`), but the rebuild section still says 「全部檔案總大小約 1.33 MB」 and 「`data/meta.js`（約 18 KB）」. Live files: meta **20.3 KB**, total **1,295.5 KB**. **Fix:** copy the printed `build_data.py` totals.

2. **`game.js:1193-1194` / `game.js:1256-1259` / `game.js:1419` / `game.js:1454` — render/settle still dereference `activeOdds` / `activeAH` with no null guard.** The pool filter makes this unreachable with current data. A future cup row without close 1X2, or a client/meta skew, would throw on `.h` / `.line` (console error on reveal). **Fix:** if the chosen market object is null, skip the match or show a Cantonese error instead of throwing.

3. **`game.js:537` — `seasonInfo.close1x2 || (seasonInfo.total || 0)` treats `0` as missing.** Opening uses `open1x2 \|\| 0` (correct for cups). Closing would substitute `total` if `close1x2` were actually 0. Current meta has `close1x2 === total` on every competition, so the live count is right. **Fix:** `Number(seasonInfo.close1x2) \|\| 0` (no `total` fallback), same as opening.

4. **`game.js:1298-1299` — AH movement else-branch always labels 「終盤讓球」.** Correct for the six closing-only AH league rows (they only appear in 終盤). There are **0** opening-only AH rows, so 初盤 never hits this branch. If one appears later, the HUD would say 初盤 while the strip says 終盤. **Fix:** label from `state.oddsType`.

5. **`tests/ah.test.js` — remaining coverage is optional.** Spec lines `0, ±0.25, ±0.5, ±0.75, ±1, ±1.25, -1.5, +2` plus the round-1 extras are present and the expected profits are correct (decimal, not HK). Not required: dedicated `±2.5` / `±2.75` profit cases (those lines are only in the exhaustive `unknown` sweep), `NaN`/non-number arguments (the function throws `TypeError`), or HK-odds rejection. Integer-goal `+0.75` still has no halfwin; tests correctly omit it.

---

## Focus-area re-check

### 1. AH settlement (`ah.js`)

Quarter detect `Math.abs(Math.round(line * 4) % 2) === 1` works for negatives. Split `line ± 0.25`, `halfStake = stake/2`, `net = goalDiff + subLine`. Payouts: win `stake*(odds-1)`, halfwin `stake/2*(odds-1)`, push 0, halfloss `-stake/2`, loss `-stake`, rounded to 2 dp. Home line = `AHh`, away = `-AHh` (`game.js:1458-1460`; match scenarios 1–4). Stored AHH/AHA sit in 1.19–4.5 → **decimal**, not HK. `node tests/ah.test.js`: **63/63**.

### 2. Data authenticity

`build_data.py:152-192` still maps opening `B365H/D/A` → `Avg` → `PS`; closing `B365C*` → `AvgC` → `PSC`; opening AH `AHh` + `B365AHH/AHA` → `AvgAH*`; closing `AHCh` + `B365CAHH/CAHA` → `AvgCAH*`. Missing fields stay `null`. Spot checks unchanged and not invented:

- EPL 13/08/2021 Brentford–Arsenal: `[4.0, 3.4, 1.95, 'B365', 3.8, 3.25, 2.05, 'B365', 0.5, 1.86, 2.07, 'B365', 0.5, 1.75, 2.05, 'B365']`
- Serie A Torino–Fiorentina 10/01/2022: opening null (CSV blank), closing B365 `3.0/3.3/2.4`
- UCL PSG–Inter 31-05-25: 1xBet `2.09/3.57/3.67`, opening/AH null; 2026/27 rows excluded

Cups never enter 初盤 or AH pools; notes at `index.html:129-131`, `game.js:647-664`, and in-match `#cup-odds-badge`.

### 3. Reroll

Unchanged and still spec-correct: leftover `unusedPool` (`game.js:1062-1066`), splice + discard (`game.js:1368-1381`), round index not incremented, AI settles the current slot, disable after reveal (`game.js:1393`) and when unused is empty (`game.js:1116-1122`), HUD + end-screen count, `R` (`game.js:1786-1789`).

### 4. Setup

Comps 全選/五大聯賽/歐洲賽; seasons 全選/全部唔揀; 5/10/20/30+custom; **bankroll** 50/100/200+custom; stake 5/10/20+custom; team/date; live count by mode+oddsType; start blocked when pool &lt; rounds (including 0 cups in 初盤/AH).

### 5. Offline / mobile / deploy

`index.html:636-638` loads `ah.js` + `data/meta.js` + `game.js`; competitions inject `data/${compId}.js` (`game.js:239-241`). Game sources: no `fetch(` / `XMLHttpRequest`. `.vercelignore` still `!ah.js`, `!data/`, `!data/*.js`. 277 Cantonese names. 390px tap targets ≥ 44px on the controls called out in round 1.

---

VERDICT: PASS
