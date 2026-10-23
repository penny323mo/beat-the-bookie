# Beat the Bookie v2 — Verdict Fix Review (Grok)

Read-only review against `prompts/v2-verdict-fix-agy.txt` and `reviews/v2-verdict-agy.md`. Source was not modified.

**Method:** line-read `verdict.js`, `tests/verdict.test.js`, `game.js` `saveBestScore` / `showEndScreen`, `index.html` HUD/end copy, `style.css` banner classes, `.vercelignore`, `test_e2e.js` Test 6; grep player-facing `AI` / `AI 本金` / `跟莊熱門`; independently re-ran `node tests/verdict.test.js` (**13 / 13**) and `node tests/ah.test.js` (**74 / 74**); independently called `calculateVerdict` for Penny (96.4 vs 94.6) and the on-disk e2e win screenshot (120 vs 84.5); inspected `screenshots/v2-390/test_end_screen_loss.png` plus the later e2e captures under `screenshots/test_*.png` (390×844). Did not re-run Chrome e2e this session.

Agy’s pasted Test 4 log (`輸給莊家`, bankroll `50.0 注`) does **not** match `screenshots/test_end_screen.png` on disk (`贏咗莊家！`, `120.0 注`, subtitle `仲贏埋電腦對手 35.5 注`). Test 6 Penny assertions and the required loss screenshot **do** match the current code. The mismatch is in the agy write-up, not in the product.

---

## Spec checklist

| # | Requirement | Result |
| :--- | :--- | :--- |
| 1 | Title from player net only (`final − startingBankroll`, round 0.1); `>0` 贏咗莊家！ / `<0` 輸給莊家 red / `==0` 打和 / 保本; praise/comfort matches | Pass — `verdict.js:43,58-73` |
| 2 | Computer-opponent subtitle, all combos 通順 | Pass — 9/9 branches + tests |
| 3 | Rename 「電腦對手（次次跟熱門）」 in HUD / end / in-app copy; no leftover 「AI 本金」 as house; bookie P/L row + house note | Pass in-app |
| 4 | ROI, badges, best-record consistent with verdict | Pass (one leftover-data Minor) |
| 5 | `verdict.js` via `<script>`, `.vercelignore` whitelist; `tests/verdict.test.js` 4 combos + 打和; e2e loss screenshot at specified path | Pass |

---

## Critical

_None._

Penny case `calculateVerdict(96.4, 94.6, 100)` → title `輸給莊家`, `statusClass: 'loss'`, subtitle `但你贏咗電腦對手 1.8 注`, `bookiePnlText` `莊家今局喺你身上贏咗 3.6 注`. Title no longer compares player vs baseline. Fallback in `game.js:1720` also uses `netPL` vs 0, so the original bug does not return even if `verdict.js` fails to load.

---

## Major

_None._

---

## Minor

1. **`README.md:52` / `README.md:66` — docs still use the old opponent name and old verdict strings.** In-app HUD / reveal / end copy is 「電腦對手（次次跟熱門）」 and 「輸給莊家」 / 「打和 / 保本」. README still says 「對抗跟莊熱門 AI」 and 「📉 輸咗畀莊家 / 🤝 打和！」 and that end-of-game always 「刷新 localStorage 最高紀錄」. `SPEC.md:38,47` is the same old wording; the fix prompt does not require a SPEC rewrite. **Fix:** align README 終局 / 對手 paragraphs with `verdict.js` titles and the profitable-only `saveBestScore` rule.

2. **`game.js:178-202` — `getBestScore` still surfaces a pre-fix losing record.** `saveBestScore` now requires `score > startingBankroll` (`game.js:195`). `getBestScore` does not reject a stored value `≤ startingBankroll`. A device that already saved `96.4` under `btb_best_v2` will keep showing it on the start banner (`game.js:705-711`) and as 「歷史最佳紀錄」. New sessions are consistent with a loss verdict. **Fix:** treat stored scores `≤ startingBankroll` as empty (or delete on read).

3. **`game.js:1706,1717-1726` — inline fallback skips 0.1 rounding and blanks subtitle / bookie row.** Live path loads `verdict.js` (`index.html:643` before `game.js:645`) so this is dead on a normal `file://` / Vercel load. If `window.calculateVerdict` is missing, title still follows player vs house, but `100.04` would be `輸給莊家` instead of `打和 / 保本`, and `#verdict-subtitle` / `#bookie-pnl-text` would be empty. **Fix:** drop the fallback or call the same round-to-0.1 helper.

4. **`screenshots/v2-390/test_end_screen.png` (and sibling HUD/reveal shots in that folder) are stale (mtime 12:58).** They still show 「跟莊熱門 AI 本金」 and 「輸畀莊家！」. Fresh 390px captures from the verdict-fix e2e landed in `screenshots/test_*.png`; only the required loss file was written into `v2-390/` (`test_e2e.js:467`). Not shipped UI. **Fix:** point `SCREENSHOTS_DIR` at `screenshots/v2-390` or recopy the new files.

---

## 1. Title = player net vs house

`verdict.js:43` `playerNet = (Math.round((playerFinal - startingBankroll) * 10) / 10) || 0` (kills `-0`). Branch at `verdict.js:58-73`:

- `>0` → `贏咗莊家！` / `win` / `🏆` / `你今局贏咗莊家 ${abs} 注`
- `<0` → `輸給莊家` / `loss` / `📉` / `莊家今局喺你身上贏咗 ${abs} 注`
- `==0` → `打和 / 保本` / `draw` / `🤝` / `今局同莊家打和（保本不失）`

`showEndScreen` (`game.js:1717-1730`) assigns `v.title` and `verdict-banner ${v.statusClass}`. CSS: `.verdict-banner.loss` red (`style.css:1740-1742`), `.draw` grey (`:1745-1747`). Detail strings at `verdict.js:80-110` match the same three buckets (praise on win, 輸少當贏 on loss-but-beat-AI, 保本 on draw).

Float tests (`tests/verdict.test.js:136-147`): `99.9999999` and `100.04` → draw / `0.0`; `100.06` → win / `0.1`. Independent check: Penny and the 120 vs 84.5 e2e frame both match the screenshot text.

`game.js:1706` `netPL` for the stat line is rounded only at display via `formatPL` (`game.js:211-214`), so 淨獲利 and title agree at 0.1.

---

## 2. Subtitle combos (all 9)

`diffVsAI` is `playerFinal - baselineFinal`, rounded 0.1 (`verdict.js:45`). Independent of `playerNet`.

| vs 莊家 | vs 電腦對手 | subtitle | test |
| :--- | :--- | :--- | :--- |
| win | win | 仲贏埋電腦對手 X 注 | `tests/verdict.test.js:28-37` |
| win | loss | 但電腦對手贏你 X 注 | `:40-49` |
| win | draw | 同電腦對手打和 | `:105-110` |
| loss | win | 但你贏咗電腦對手 X 注 | `:52-62` Penny |
| loss | loss | 電腦對手贏你 X 注 | `:65-74` |
| loss | draw | 同電腦對手打和 | `:112-118` |
| draw | win | 兼且贏咗電腦對手 X 注 | `:77-84` |
| draw | loss | 但電腦對手贏你 X 注 | `:86-93` |
| draw | draw | 同電腦對手打和 | `:95-102` |

Contrast particles (`但` / `仲` / `兼且`) sit on the branches that need them; loss×loss has no `但`, which matches the spec example list. Custom bankrolls 50 / 200 also covered (`:121-133`).

---

## 3. Rename, bookie row, no 「AI 本金」

In-app strings are the required name:

- intro `index.html:32`, rules `:62-63`
- HUD `index.html:299` (fresh `screenshots/test_game_1x2_round1.png` / `test_game_ah_round1.png`)
- reveal `index.html:536` (fresh `screenshots/test_game_1x2_revealed.png`)
- end stat `index.html:577`

No player-facing 「AI 本金」 in `*.html` / `*.js` / `*.css`. Remaining `AI` tokens are `diffVsAI` (internal field) and comments `game.js:10,1505,1532,1572` (「Baseline AI Opponent Settlement」). Fav badges stay 「莊家熱門」 (`game.js:1239-1241`) — that is the house favourite, not the opponent bankroll.

End screen bookie row `#bookie-pnl-banner` / `#bookie-pnl-text` (`index.html:560-562`) plus house note (`:564`): 「莊家係開盤抽水嘅 House，你同電腦對手都係賭客，一齊同莊家對賭。」 Loss screenshot shows 🏦 + red `.bookie-pnl-banner.loss` (`style.css:1788-1791`).

The long HUD label wraps to two lines at 390px; both names and bankrolls stay readable.

---

## 4. ROI, badges, best record

- ROI: `roiPct = (netPL / initial) * 100` then `formatPL` (`game.js:1709,1776-1777`). Penny → `-3.6%`, same sign and 0.1 as `playerNet`. Label 「基於本金 {initial} 注」 uses `state.startingBankroll`, not a hardcoded 100.
- Trophy badge follows `v.trophy` (`game.js:1728`); loss screenshot is 📉, win screenshot is 🏆.
- Recap `recap-pl-badge` is per-round P/L, not the house verdict — fine.
- `saveBestScore` (`game.js:191-202`) writes only when `score > startingBankroll` **and** beats `cur`. First loss: `currentBest === null` → 「暫無盈利紀錄」 / 「今局未達盈利門檻」 (`game.js:1756-1759`). A later loss after a real high score shows the stored high + 「維持紀錄」 (historical, not this session). See Minor 2 for old localStorage values.

---

## 5. Module load, tests, e2e screenshot

- `index.html:642-645`: `ah.js` → `verdict.js` → `data/meta.js` → `game.js`. Browser export `window.calculateVerdict` (`verdict.js:130-132`); Node `module.exports` (`:128-129`).
- `.vercelignore:6` `!verdict.js` next to `!ah.js`.
- `tests/verdict.test.js`: 13 cases (4 combos + three 打和 variants + win/loss×draw-vs-AI + custom 50/200 + float + `TypeError`). Independently **13 / 13**. AH suite **74 / 74**.
- `test_e2e.js:429-467` injects Penny bankrolls via `window.__BTB_TEST__` (`game.js:1962`), asserts title / subtitle / bookie line / `.loss` on both banners, captures `screenshots/v2-390/test_end_screen_loss.png` at `--window-size=390,844`. On-disk image matches: red 「輸給莊家」, 「但你贏咗電腦對手 1.8 注」, 「莊家今局喺你身上贏咗 3.6 注」, player 96.4 / −3.6, opponent 94.6 / −5.4, house note visible.

---

VERDICT: PASS
