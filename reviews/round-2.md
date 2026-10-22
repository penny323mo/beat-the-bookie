# Round 2 review — Beat the Bookie vs SPEC.md

Re-checked `index.html`, `style.css`, `game.js`, `data.js`, `build_data.py`, `README.md` against `SPEC.md`, and verified every item in `reviews/round-1.md`.

Round-1 **Critical: none** still holds. Data pipeline is unchanged and still correct (760 matches, ISO dates, B365-then-Avg, FTR matches scores, all 23 spec names). Odds maths, P/L = `10*(odds−1)`, exact-score `+20` only when both steppers are set, baseline favourite with H>A>D ties, 10 distinct shuffled matches, season filter, end-screen hit rate / exact hits / ROI / verdict, and `btb_best` try/catch are correct.

Round-1 Majors are fixed: Enter/Space no longer steal season radios or `返主頁`; `.bookmaker-bar` / `.result-comparison-row` stack under 380px; exact-score row wraps and the clear button takes a full row. Round-1 Minors/Nits are also addressed (`你嘅`, blank `—` steppers, post-reveal disable, `isAdvancing` latch, dynamic 彩金 subtext, radiogroup arrows, toggle focus ring, recap `max-height: none`, screen focus move, localStorage failure copy, `--text-dim`, `prefers-reduced-motion`, 36px steppers, in-page error banner, remainder-to-100%). New 360px screenshots (`screenshots/round-1-fixes-360px-*.png`) show the bookmaker % attached to its label and recap rows readable.

The remaining problem is a **regression from the round-1 focus + shortcut changes**: finishing the 10th match with Enter/Space can skip the end screen.

---

## Critical

*(none)*

---

## Major

- **`game.js:907` / `game.js:296` — Enter/Space on the last revealed round skips the end screen and starts a new session.** `advanceNextRound()` on round 10 calls `showEndScreen()` → `showScreen()` which synchronously `focus()`es `#replay-btn`. `#replay-btn` is in `primaryCtas`, so the next `keydown` (key-repeat while holding Enter/Space, or the habitual second tap used as 「下一場」 through the rest of the session) hits the end-screen branch and calls `startNewGame()`. Spec requires the end screen (bankroll, hit rate, exact hits, ROI, recap, verdict). `isAdvancing` is cleared at the start of `showEndScreen()`, so it does not block this. **Fix:** ignore `e.repeat` in the window keydown handler; do not auto-focus `#replay-btn` (focus `#verdict-text` with `tabindex="-1"` instead); and/or keep a short `endScreenJustOpened` latch so the same key that advanced off round 10 cannot also fire `startNewGame()`.

---

## Minor

- **`game.js:295` / `game.js:887` — round 1 Enter/Space no longer reveals.** `showScreen(gameScreen)` focuses `#btn-pick-h`. That node matches `closest('button, …')` and is not a primary CTA, so the global Enter/Space handler returns. Native Enter only re-clicks 主勝. README still says Enter/Space 揭曉. After a pick via `1`/`X`/`2` the user must Tab to `#reveal-btn`. **Fix:** after `handlePick`, move focus to `#reveal-btn`, or treat the three `.odds-choice-btn` as primary CTAs for Enter/Space once `selectedPick` is set (Enter = reveal, not re-pick).

- **`style.css:937` / `style.css:989` — exact-score controls look live after reveal.** JS sets `disabled` on the checkbox and steppers (`game.js:549`), but there is no `:disabled` dimming. The green switch in `screenshots/round-1-fixes-360px-revealed.png` still reads as on/interactive. **Fix:** `.toggle-checkbox:disabled + .toggle-switch-visual { opacity: 0.45; }` and the same for `.stepper-btn:disabled` / `.clear-score-btn:disabled`.

- **`game.js:369` / `index.html:69` — error banner `.focus()` is a no-op.** `#start-error-banner` is a `div` with `role="alert"` and no `tabindex`, so `HTMLElement.focus()` does not move focus. If `startNewGame()` is called from 再玩一轉, the banner also lives on the hidden start screen. **Fix:** `tabindex="-1"` on the banner; if the call came from the end screen, `showScreen(DOM.startScreen)` before showing the error.

- **`index.html:133` — HUD divider is still `VS`.** Round-1 nit asked to replace English chrome; the pitch badge is now `對賽` but the bankroll column still says `VS`. **Fix:** `對賽` (or `對`).

---

## Nit

- **`game.js:818` / `game.js:837` — first `+` from blank sets 1, not 0.** Minus from `null` becomes 0; plus becomes 1, so 0 is only reachable via minus. Spec is 0–9. **Fix:** first plus from `null` should also land on 0 (then the next plus is 1), or both buttons start at 0.

- **`game.js:855` — redundant `#home-btn` keydown.** Native `type="button"` already clicks on Enter/Space; the extra listener is harmless only because the global handler bails on non-primary buttons.

- **`index.html:6` / `index.html:19` — title/sub-tag still include `Beat the Bookie`.** Acceptable as a bilingual product name; leftover English in the chrome is otherwise gone.

---

VERDICT: REQUEST CHANGES
