# Beat the Bookie v2 — Round 1 Review

Read-only review against `prompts/v2-round-0-agy-build.txt`, `prompts/v2-round-0b-agy-reroll.txt`, and the round-0 report `reviews/v2-round-0-agy.md`. Source was not modified.

**Method:** read `ah.js`, `tests/ah.test.js`, `build_data.py`, `game.js`, `index.html`, `style.css`, `.vercelignore`, `data/*.js`, `raw/` samples; ran `node tests/ah.test.js` (40/40 pass); sampled EPL/Serie A/La Liga CSVs and UCL JSON against generated tuples.

**What holds:** AH quarter split / half-win / half-loss / push / home-away sign / decimal payouts are correct; league CSV columns map to B365→Avg→PS and `*C` / `AHh`+`B365AHH` / `AHCh`+`B365CAHH` with nulls rather than invented numbers; 11,188 matches and 8,908 AH matches match meta; reroll uses the leftover filtered pool, does not consume a slot, discards the replaced match, syncs the AI (settlement reads the current slot), disables after reveal and when unused pool is empty, counts on HUD + end screen, and binds `R`; setup multi-select, season 全選/全部唔揀, 5/10/20/30+custom, stake, team/date filters, live count, and start-block when pool &lt; rounds all exist; lazy load is `<script src>` (no `fetch`); `.vercelignore` un-ignores `ah.js` and `data/*.js`; 277 teams have Cantonese names.

---

## Critical

_None._ AH settlement math, CSV/JSON extraction, and offline load path are sound. Remaining defects mis-label a real market or omit a promised setup control; they do not fabricate odds or mis-settle a quarter line.

---

## Major

1. **`game.js:907-910` / `game.js:1091` / `game.js:1317` / `game.js:493-517` / `game.js:767-780` — 初盤 mode still deals European cups (and a handful of league rows with no opening) and settles them at closing while the HUD says 初盤.**

   Spec: opening vs closing “where available”; cups have no opening/AH and those features “must be hidden/disabled” with a Cantonese note. AH mode does skip cups (`!hasOpenAH && !hasCloseAH`). Opening 1X2 does not skip missing `open1X2`.

   Fallback used for both render and settlement:

   ```js
   const activeOdds = (state.oddsType === 'opening' && match.open1X2)
     ? match.open1X2
     : (match.close1X2 || match.open1X2);
   ```

   Same pattern for AH at `game.js:1154` and `game.js:1352` (`openAH` else `closeAH || openAH`).

   Consequences:
   - Default pool in 初盤 still includes all **2,280** cup matches (UCL 753 + UEL 799 + UECL 728). Live count stays **11,188** because `updateLivePoolCount` never reads `state.oddsType`, and the odds-type control does not call it.
   - HUD `hudModeBadge` is `1X2 · 初盤` (`game.js:999-1000`) while buttons and P/L use 1xBet **closing**. Movement does print `無初盤` / `(終盤)` and `#cup-odds-badge` appears, so there is a note, but the bet is not hidden and the labelled market is wrong.
   - One real Serie A row has empty opening 1X2 in the CSV (`Torino` vs `Fiorentina`, 10/01/2022 — B365/Avg/PS all blank, closing B365 3.0/3.3/2.4). In 初盤 it is still dealt and settled at closing.
   - Six league rows have closing AH only (no `AHh`): they remain in the AH+opening pool and settle on `closeAH` while the badge says 初盤.

   Setup `#cup-odds-note` (`index.html:141-143`) only toggles when the odds-type buttons are clicked, not when the player later hits 「五大聯賽」/「歐洲賽」 (`game.js:656-711`).

   **Fix:** when `oddsType === 'opening'`, drop matches with null `open1X2` (1X2) / null `openAH` (AH) from both the live count and `startNewGame` pool; call `updateLivePoolCount()` (and refresh `#cup-odds-note`) on every odds-type **and** competition change; keep the cup badge for closing-mode cup matches.

2. **`index.html:41-42` / `index.html:165-178` / `game.js:275` — 自訂初始本金 is advertised and required by the v2 prompt, but there is no control.**

   Prompt: “Stake per bet (e.g. 5/10/20/custom) **and starting bankroll**.” Intro copy: 「自訂每局場數、**初始本金**同每場注碼」. Stake chips 5/10/20+custom exist. `startingBankroll` is hardcoded `100.0` with no input, so ROI (`game.js:1513`) and both bankrolls are always vs 100 even at stake 20×30 rounds.

   **Fix:** add a bankroll preset (e.g. 50/100/200+custom) next to stake, write it into `state.startingBankroll`, and drop or rewrite the intro claim if the product decision is “always 100”.

3. **`style.css:1554-1556` / `style.css:2008-2012` — 390px tap targets for 波膽 steppers are 34px (38px in the mobile query), below the spec ≥44px.**

   Spec: iPhone Safari 390px, 「按鈕觸控目標全部 ≥ 44px」. Base `.stepper-btn` is `width/height: 34px`. The `@media (max-width: 420px)` block **shrinks** it to 38×38. Chip / segment / reroll buttons do meet 44px (`style.css:383`, `444`, `955`).

   **Fix:** set `.stepper-btn` (and the 420px override) to at least 44×44. While there: `.custom-input-wrap input` is 38px (`style.css:497`) and `.date-input` is 40px (`style.css:609`).

---

## Minor

1. **`tests/ah.test.js` — spec-listed lines are covered and expected values are right; extra families are missing.**

   Ran `node tests/ah.test.js`: **40/40 passed**. Checked by hand:
   - Quarter split `line ± 0.25`, `halfStake = stake/2`, `net = goalDiff + subLine`.
   - Full win `stake*(odds-1)` = 9.00 at 1.90; halfwin 4.50; halfloss −5.00; loss −10.00; push 0.
   - Home uses `AHh`; away uses `-AHh` (scenarios 1–4, including away halfwin at 1.85 → 4.25).
   - Odds treated as **decimal**, not HK (football-data AHH/AHA in the CSVs sit in 1.19–4.5; a HK 0.90 would yield negative “win” profit).
   - `+0.75` has no integer-goal halfwin (0.5-win + 1.0-push cannot co-occur); tests correctly only have win / halfloss / loss. Same for `-1.25` halfwin.

   Spec-required set `0, ±0.25, ±0.5, ±0.75, ±1, ±1.25, -1.5, +2` is present. Gaps: `+1.5`, `-2`, `±1.75`, `±2.25`, non-10 stake, `odds === 2.00`, and a non-quarter identity check that one half-stake path does not double-count. `ah.js:60-61` `unknown` (win+loss on the two halves) cannot fire for integer goals on 0.5-spaced splits; worth an explicit assert.

2. **`build_data.py:294-308` — cup rows with no joined 1X2 are still stored as all-null odds.**

   Current dumps: UCL/UEL/UECL unmatched odds = 0, every cup close1X2 is `1xBet`, so no live crash. If a future JSON miss occurs, `startNewGame` will still enqueue the row (`game.js:943-944`) and `activeOdds.h` will throw. Skip (or require `c1x2_h/d/a`) the same way leagues skip empty 1X2.

3. **`build_data.py:405` / README size claim — meta byte count uses the last competition file size.**

   `total_bytes += sz` after writing `meta.js` re-adds `uecl.js` (~90.4 KB) instead of `meta_sz` (18.2 KB). Printed/agy total **1,365.6 KB (1.33 MB)**; actual `data/` sum is **1,293.4 KB (1.26 MB)**. Still under 1.5 MB; report only. Use `total_bytes += meta_sz`.

4. **`game.js:232-239` — failed `<script>` load can hang later retries.**

   `loadedScripts.add(compId)` runs before `onerror`. A 404 rejects the first promise but leaves the id in the set, so the next `loadCompetitionData` waits forever on `setInterval` with no timeout. Clear the id on error (and time the poll out).

5. **`game.js:92-94` / `game.js:1024` — club palettes never apply.**

   `createTeamCrestSVG(match.home.zh, match.home.en)` colours from the **Cantonese** name; `CLUB_PALETTES` is keyed in English (`Arsenal`, `Liverpool`, …). Every mapped club gets a hash colour. Look up `enName` first.

6. **`index.html:55` / `index.html:494` — leftover mixed copy.**

   Intro heading uses English `vs` (「初盤 vs 終盤走勢」). Exact-score clear is 「不猜波膽」 (`不` rather than `唔`). HUD `對賽` and 你嘅本金 are fine.

7. **AH opening-only / closing-only rows are real, not invented — but the client must not backfill.**

   Spot checks vs CSV (not fabricated):
   - EPL `13/08/2021` Brentford–Arsenal: JS `[4.0, 3.4, 1.95, 'B365', 3.8, 3.25, 2.05, 'B365', 0.5, 1.86, 2.07, 'B365', 0.5, 1.75, 2.05, 'B365']` matches `B365H/D/A`, `B365C*`, `AHh`+`B365AHH/AHA`, `AHCh`+`B365CAHH/CAHA`.
   - La Liga `23/10/2021` Valencia–Mallorca: empty `B365AHH`, stored `Avg` 1.90/1.98 — correct fallback (`build_data.py:173-178`).
   - EPL `21/04/2026` Brighton–Chelsea: empty `AHh` so opening AH is null even though `B365AHH` is filled; closing `AHCh=-0.25` kept. Correct (do not invent a line).
   - UCL PSG–Inter `31-05-25` 5–0: JSON 1xBet `2.09/3.57/3.67` matches `data/ucl.js`; opening/AH all null; 2026/27 rows excluded.

   FTR matches scores on all 11,188 rows; no 1X2/AH value &lt; 1.0. Column mapping in `build_data.py:149-188` is the football-data layout (opening `B365H` not `B365CH`; `AHh` vs `AHCh`; prefix `B365AH`+`H` → `B365AHH`).

---

## Checklist (focus areas)

| Area | Result |
| :--- | :--- |
| AH quarter / half / push / sign / decimal payout | Pass (`ah.js`; 40/40 tests) |
| `tests/ah.test.js` coverage vs spec lines | Pass for required lines; extra families missing (Minor 1) |
| Data authenticity / no invented odds | Pass (nulls + documented fallbacks) |
| football-data B365/Avg/PS and `*C`, `AHh` vs `AHCh` | Pass |
| Cups hide opening + AH | Partial — AH skipped; opening still dealt (Major 1) |
| Reroll: same pool, no repeats, no slot burn, AI sync, disable after reveal, count, `R` | Pass (`game.js:960-964`, `1266-1279`, `1291`, `1683-1687`) |
| Setup: comps, seasons 全選/全部唔揀, 5/10/20/30+custom, stake, team/date, live count, block start | Pass except starting bankroll (Major 2) |
| Offline `<script>` lazy load, not `fetch` | Pass (`index.html:622-624`, `game.js:224-258`; repo grep `fetch(` = 0) |
| Cantonese team names | Pass (0 unmapped of 277) |
| 390px mobile tap targets | Fail on steppers (Major 3) |
| `.vercelignore` includes `ah.js` and `data/` | Pass (`!ah.js`, `!data/`, `!data/*.js`) |

Reroll notes (no issue): `unusedPool = shuffled.slice(roundsCount)` so future session slots cannot reappear; the replaced match is overwritten and not pushed back; `currentRoundIdx` is unchanged; `loadRound` rebuilds the board so the AI settles the new match at reveal; after reveal `rerollBtn.disabled = true` and the `R` handler bails on `isRoundRevealed`. Selecting a pick does **not** disable reroll (reveal is 「確認下注」); that matches “before bet/reveal”.

---

VERDICT: NEEDS_FIXES
