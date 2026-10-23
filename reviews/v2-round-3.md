# Beat the Bookie v2 — Round 3 Review

Read-only review against `prompts/v2-round-0-agy-build.txt`, `prompts/v2-round-0b-agy-reroll.txt`, `reviews/v2-round-2.md`, and `reviews/v2-round-2-agy-fix.md`. Source was not modified.

**Method:** re-read `ah.js` and `tests/ah.test.js` line-by-line; independently re-derived quarter / half / push / home-away cases in Node; ran `node tests/ah.test.js` (73/73); re-sampled EPL CSV vs `data/epl.js` and UCL JSON vs `data/ucl.js`; grepped the round-2 fix sites in `game.js`, `README.md`, `style.css`, `.vercelignore`.

---

## Round-2 follow-up

| Round-2 item | Status |
| :--- | :--- |
| m1 `README.md` 仍寫 1.33 MB / meta 18 KB | **Fixed.** `README.md:104-106` now `data/meta.js`（約 20.3 KB）and 1,295.5 KB (1.27 MB). Matches `data/` on disk. |
| m2 `activeOdds` / `activeAH` 無 null guard | **Fixed.** Render early-returns with `—` / disabled buttons (`game.js:1194-1220`, `1286-1303`). Reveal alerts in Cantonese and returns (`game.js:1469-1471`, `1508-1510`). See leftover Minor 1. |
| m3 `close1x2 \|\| total` | **Fixed.** `game.js:537` is `Number(seasonInfo.close1x2) \|\| 0`. |
| m4 AH else-branch 寫死「終盤讓球」 | **Fixed.** `game.js:1347-1348` uses `state.oddsType === 'opening' ? '初盤讓球' : '終盤讓球'`. |
| m5 optional `±2.5` / `±2.75` tests | **Fixed.** Ten new cases; suite is **73/73**. Expected values match the split (`+2.75` at diff −3 → halfloss −5; `-2.75` at diff 3 → halfwin 4.50). |

No regression on round-1 majors (初盤 pool, bankroll UI, 44px tap targets, cup skip, script timeout, crest palette, 粵語 copy).

---

## Critical

_None._

---

## Major

_None._

---

## Minor

1. **`game.js:1437-1472` / `game.js:1508-1510` — missing-odds reveal leaves the round stuck.** The new guard runs *after* `state.isRoundRevealed = true` and after disabling reroll / picks. On `return`, `#round-result-card` never appears, `advanceNextRound` requires a reveal, and a second Enter no-ops. Unreachable with the current filtered pool (render also disables the pick buttons). Keyboard `1`/`X`/`2` still calls `handlePick` (`game.js:1354`, `1849-1852`) even when those buttons are `disabled`. **Fix:** reset `isRoundRevealed` (and re-enable controls) before `return`, or refuse `handlePick` when the active market is missing.

2. **`ah.js:22-25` — `typeof x === 'number'` accepts `NaN`.** `settleAH(NaN, -0.75, 1.9, 10)` does not throw; both halves fall through to `loss` (profit −10). Non-number types do throw `TypeError` as documented. No test covers `NaN`, `Infinity`, or the `TypeError` branch. Not a live-data path. **Fix:** `Number.isFinite(...)` on all four args, plus one test.

---

## 1. AH settlement (re-derived)

`ah.js` is unchanged in formula from rounds 1–2; tests grew.

| Rule | Implementation | Verdict |
| :--- | :--- | :--- |
| Quarter (`x.25` / `x.75`) | `Math.abs(Math.round(line * 4) % 2) === 1`; JS `%` on negatives still works (`-3 % 2 === -1`, `abs === 1`) | Pass |
| Split | `l1 = line − 0.25`, `l2 = line + 0.25` (e.g. −0.75 → −1.0 / −0.5; +2.75 → +2.5 / +3.0) | Pass |
| Non-quarter | two identical half-stakes; sums to full `stake*(odds-1)` / `-stake` / `0` | Pass |
| `net` | `goalDiff + subLine` (backed-side diff; home line = AHh, away = −AHh at `game.js:1516-1517`) | Pass |
| Win / halfwin / push / halfloss / loss | combine two half outcomes; profit rounded to 2 dp | Pass |
| Decimal vs HK | win at 1.90 / stake 10 = **+9.00**, not +19; stored AHH/AHA range **1.19–4.5** | Decimal, correct |
| `unknown` | exhaustive test over 25 lines × 21 integer diffs never hits it | Pass |

Independent Node re-check of 15 textbook rows (including home −0.75 halfwin, away +0.75 halfloss, ±1 push, ±2.75 half) all matched. `node tests/ah.test.js`: **73 / 73**.

Coverage vs spec `0, ±0.25, ±0.5, ±0.75, ±1, ±1.25, -1.5, +2` plus extras `+1.5, -2, ±1.75, ±2.25, ±2.5, ±2.75`, stakes 5/25/50, odds 2.00, non-quarter identity, four home/away match scenarios. Integer-goal `+0.75` has no halfwin; tests correctly omit it. Remaining gap is Minor 2 (`NaN` / `TypeError`).

---

## 2. Data authenticity

`build_data.py:152-192` still maps opening `B365H/D/A` → `Avg` → `PS`; closing `B365C*` → `AvgC` → `PSC`; opening AH `AHh` + `B365AHH/AHA` → `AvgAH*`; closing `AHCh` + `B365CAHH/CAHA` → `AvgCAH*`. Nulls, no invention.

Spot check EPL 13/08/2021 Brentford–Arsenal: JS `[4.0, 3.4, 1.95, 'B365', 3.8, 3.25, 2.05, 'B365', 0.5, 1.86, 2.07, 'B365', 0.5, 1.75, 2.05, 'B365']` equals CSV `B365H/D/A`, `B365CH`, `AHh`+`B365AHH`, `AHCh`+`B365CAHH`. UCL first row opening/AH all `null`, close 1xBet `2.09/3.57/3.67`. Cups stay out of 初盤 and AH pools (`game.js:1006-1012`); notes at `index.html:129-131`, `game.js:647-664`, `#cup-odds-badge`. 277/277 teams mapped.

---

## 3. Reroll

Same correct path: leftover `unusedPool` (`game.js:1062-1066`), splice + discard (`game.js:1417-1430`), slot index unchanged, AI settles the current match, disable after reveal (`game.js:1442`) and when unused is empty, HUD + end-screen count, `R` (`game.js:1843-1846`).

---

## 4. Setup

Comps 全選/五大聯賽/歐洲賽; seasons 全選/全部唔揀; 5/10/20/30+custom; bankroll 50/100/200+custom; stake 5/10/20+custom; team/date; live count by mode+oddsType (`game.js:527-538`); start blocked when pool &lt; rounds.

---

## 5. Offline / mobile / deploy

`index.html:636-638` loads `ah.js` + `data/meta.js` + `game.js`; competitions inject `data/${compId}.js` (`game.js:239-241`). Game JS/HTML: no `fetch(` / `XMLHttpRequest`. `.vercelignore` still `!ah.js`, `!data/`, `!data/*.js`. Stepper / chips / inputs `min-height: 44px` (`style.css:1559-1563`, `2019-2023`).

---

VERDICT: PASS
