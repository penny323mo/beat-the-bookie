# Round 1 review — Beat the Bookie vs SPEC.md

Checked `index.html`, `style.css`, `game.js`, `data.js`, `build_data.py`, `README.md` against `SPEC.md` (data extraction, odds maths, 10 distinct matches, season filter, end-screen stats, `localStorage`, Cantonese UI, 360px layout, a11y, keyboard, state). Regenerated the CSV parse in-memory and diffed it against committed `data.js`: 760 matches (380 + 380), ISO dates, B365 odds, FTR consistent with scores, all 23 spec team names mapped. Margin-removed probabilities, overround %, P/L = `10*(odds-1)`, exact-score `+20`, and baseline favourite-picking (H preferred when H and A share the lowest odds; 10 such ties in the data) are implemented correctly. Replay via `startNewGame()` does reset bankrolls, recap, round index, and the current-round pick/reveal flags (through `loadRound`).

---

## Critical

*(none — data pipeline and settlement maths match the spec)*

---

## Major

- **`game.js:778` / `game.js:783` — Enter/Space are global screen shortcuts and cancel the focused control.** On the start screen, `Enter` / `Space` always call `startNewGame()` and `preventDefault()`, so a keyboard user who Tabs to `2024/25 賽季` or `兩季混合` cannot activate that radio; the game starts with whatever season was already selected (default `2025/26`). On the end screen the same handler always calls `startNewGame()`, so Tab to `返主頁` then Enter/Space starts a new session instead of returning home. Spec requires the UI to be keyboard-usable and names both `再玩一轉` and `返主頁`. **Fix:** if `e.target` is a `button` / `input` / `[role=radio]`, return and let that control’s own click/change handler run; only treat Enter/Space as a screen-level shortcut when focus is on `body` or the primary CTA (`#start-game-btn`, `#reveal-btn`, `#next-round-btn`, `#replay-btn`).

- **`style.css:687` / `style.css:1062` — 360px layout breaks the bookmaker bar and the post-reveal comparison row.** `.bookmaker-bar` is a non-wrapping flex row of “莊家抽水率 (Margin)：” + gold % + “本場固定下注：10 注”. At 360px the % detaches from its label and sits on the stake line (`screenshots/02-round-pick-mobile.png`, `03-reveal-mobile.png`). `.result-comparison-row` likewise splits `跟莊熱門結算：` across lines beside a long P/L string. Spec: mobile-first, works 360px wide. **Fix:** `@media (max-width: 380px)` stack `.bookmaker-bar` and `.result-comparison-row` as columns (`flex-direction: column; align-items: flex-start; gap: 6px`), allow `.bar-title` / `.stake-reminder` to wrap, and keep `.margin-val` immediately after its label (e.g. `white-space: nowrap` on `.margin-indicator`).

- **`style.css:917` — exact-score stepper row does not wrap at 360px.** `.exact-score-steppers` is a single flex row (home stepper + colon + away stepper + `不猜波膽`) with `gap: 14px` and no `flex-wrap`. At 360px (app padding 8px + card 14px + section 12px) the row is ~317px into a ~292px content box; `body { overflow-x: hidden }` clips it. **Fix:** `flex-wrap: wrap;` and on `max-width: 380px` drop the clear button onto its own full-width row (`flex-basis: 100%` or a 2-row grid).

---

## Minor

- **`index.html:124` / `index.html:291` / `index.html:318` / `index.html:324` — HUD and end-screen copy uses Mandarin 的, not 廣東話 嘅.** Spec: all user-facing text in Cantonese (Traditional Chinese, 廣東話 tone). Intro copy correctly uses 嘅/喺/睇下, but the live HUD says `你的本金`, `你的結算`, `你的最終本金`, and the placeholder verdict `你的眼光…`. **Fix:** `你嘅本金` / `你嘅結算` / `你嘅最終本金` / `你嘅眼光…` (and the JS strings that overwrite `verdict-detail`).

- **`game.js:176` / `game.js:348` / `index.html:251` — exact-score default is 1-0, not off/blank.** Spec: optional exact-score steppers `0–9`, default off/blank. Toggle starts off (good), but enabling it silently commits `guessHome = 1`, `guessAway = 0`. 1-0 is a common FT score, so a player who only flips the switch can collect the +20 bonus without choosing a score. **Fix:** keep `exactScoreActive` true only after the user changes a stepper (or start at `null`/`null` and treat untouched as no guess); show `—` until a value is set.

- **`game.js:471` — after reveal, exact-score toggle and steppers stay enabled.** 1X2 buttons are `disabled`, but `handleScoreToggle` / stepper clicks do not check `state.isRoundRevealed`, so the guess UI can still be edited (P/L is already frozen). **Fix:** disable the checkbox, steppers, and clear button in `revealRound()` (and re-enable in `loadRound()`).

- **`game.js:591` — `advanceNextRound()` has no reveal/lock guard.** `revealRound()` bails if already revealed; `advanceNextRound()` will increment `currentRoundIdx` whenever it is invoked. A second activation while `#next-round-btn` is still the event target (Enter default action if `preventDefault` is skipped, or a queued click) skips a match; hit rate still divides by 10. **Fix:** `if (!state.isRoundRevealed) return;` and/or an `isAdvancing` latch cleared at the end of `loadRound` / `showEndScreen`.

- **`index.html:344` — exact-score subtext is hardcoded `彩金 +20 注`.** JS updates `#stat-score-hits` (`game.js:659`) but never the subtext, so 0 hits and 2 hits still read +20. **Fix:** give it an id and set `彩金 +${exactHitCount * 20} 注` (or hide it at 0).

- **`index.html:71` — season `radiogroup` is not keyboard-complete.** Three `role="radio"` buttons are all tab stops; there is no arrow-key roving tabindex. Combined with the Major shortcut bug, season choice is effectively pointer-only. **Fix:** even after scoping Enter/Space, implement radiogroup arrows (`Left`/`Right`/`Home`/`End`) and `tabindex="0"` only on the checked button.

- **`style.css:873` — exact-score checkbox is an unpositioned `opacity: 0` input.** `pointer-events: none` plus `position: absolute` without a `position: relative` label means `:focus-visible` (style.css:1310) can ring at the card origin rather than on the switch. **Fix:** `position: relative` on `.custom-toggle-label`, visually hide the input with the clip/1px pattern, and draw the gold ring on `.toggle-switch-visual` when the input is `:focus-visible`.

- **`style.css:1208` / `style.css:1253` — end-screen recap hides half the session.** `.recap-list { max-height: 380px; overflow-y: auto }` plus `.recap-fixture { white-space: nowrap; text-overflow: ellipsis }` means ~5 of 10 rows are below the fold with no scroll cue (`screenshots/04-end-desktop.png` clips #6; `04-end-mobile.png` truncates `貝迪斯` and wraps `客勝`). Spec asks for a per-match recap of all 10. **Fix:** raise or drop `max-height` on desktop, allow fixture names to wrap, and keep pick/result on one readable line (stack the P/L badge under the fixture at 360px).

- **`game.js:275` — no focus move when switching screens.** After `開波` / `再玩一轉` / `返主頁`, focus is not sent to the new view’s first control (odds `1` or `開波`). Keyboard users have to Tab from `body`. **Fix:** `showScreen` should `.focus()` the primary control of that view (`#btn-pick-h` / `#start-game-btn` / `#replay-btn`).

- **`game.js:641` — localStorage failure is labelled `維持紀錄`.** `getBestScore`/`saveBestScore` correctly use try/catch, but when storage throws, `saveBestScore` returns false and the end card still says `維持紀錄` even on the first game. **Fix:** if `getBestScore()` is still null after save, set subtext to `未能儲存本機紀錄` (and keep showing this session’s bankroll).

- **`style.css:33` — `--text-dim: #64748b` on the pitch background is ~3.4:1.** Used for `.shortcut-hint`, `.prob-label`, `.bar-title` is muted (OK) but dim labels fail WCAG AA for small text. Spec: sufficient contrast. **Fix:** raise to at least `#94a3b8` (already used as `--text-muted`).

---

## Nit

- **`style.css:125` / `style.css:429` — `floatBall` and `pulse-glow` run with no `prefers-reduced-motion`.** Wrap animations in `@media (prefers-reduced-motion: no-preference)` or disable them in a `reduce` query.

- **`style.css:1342` — 360px stepper hit targets are 28×28px.** 1X2 buttons are large; steppers fall under a comfortable 44px target. Keep 34px (or min 44px padding) even at 360px.

- **`index.html:19` / `index.html:182` / `index.html:348` — leftover English in the chrome** (`Beat the Bookie`, `VS`, `(Margin)`, `(ROI)`). Spec wants Cantonese UI; glosses in parentheses are the weakest issue. Prefer `對賽` / `抽水率` / `回報率` if you strip English.

- **`game.js:314` — missing-data path uses `alert()`.** Works, but is English-browser-chrome and blocks. A small in-page banner on `#start-screen` would match the rest of the UI.

- **`game.js:384` — implied % is `toFixed(1)` per outcome, so ~197 matches display 99.9% or 100.1%.** Maths are correct; if you want a guaranteed 100.0, assign the remainder to the last bucket.

- **`game.js:93` — favourite tie-break is H then A then D** (never “first in 1X2 order”). Valid handling; worth a one-line comment so a later change does not mark two badges or pick D on an H/A tie.

---

VERDICT: REQUEST CHANGES
