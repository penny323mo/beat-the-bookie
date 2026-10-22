# SPEC — 「你估得贏莊家嗎？」(Beat the Bookie)

Single-page browser game using REAL La Liga data (football-data.co.uk CSVs in this folder: `SP1_2526.csv` = 2025/26, `SP1_2425.csv` = 2024/25). Runs by double-clicking `index.html` (file://, no server, no network, no CDN, no external fonts).

## Files (all in this folder)
- `build_data.py` — Python 3 stdlib only. Reads both CSVs (`encoding='utf-8-sig'`), writes `data.js` defining `window.MATCHES = [...]`.
  Per match: `season` ("2025/26"), `date` (ISO `YYYY-MM-DD`, CSV is `DD/MM/YYYY`), `home`, `away`, `fthg`, `ftag`, `ftr` (H/D/A), `odds` {h,d,a} from `B365H/B365D/B365A`, falling back to `AvgH/AvgD/AvgA` if B365 missing/blank; skip rows with no usable odds or result. Also include half-time score `hthg/htag` and shots `hs/as` (optional for reveal).
- `data.js` — generated, committed.
- `index.html`, `style.css`, `game.js` (may be inline if preferred, but keep JS readable).
- `README.md` short (Cantonese) on how to play / regenerate data.

## Gameplay
1. Start screen: title 「你估得贏莊家嗎？」, short rules in Cantonese, season choice (2025/26, 2024/25, 兩季混合), best score from localStorage, 「開波！」button.
2. Session = 10 random distinct matches from chosen pool. Bankroll starts at 100 units.
3. Each round shows: round n/10, season + date, home vs away (team names: show Cantonese/Chinese name with original name small, e.g. 皇家馬德里 Real Madrid, 巴塞隆拿 Barcelona, 馬德里體育會 Ath Madrid, 畢爾包 Ath Bilbao, 皇家蘇斯達 Sociedad, 維拉利爾 Villarreal, 貝迪斯 Betis, 西維爾 Sevilla, 華倫西亞 Valencia, 切爾達 Celta, 赫塔菲 Getafe, 基羅納 Girona, 奧沙辛拿 Osasuna, 馬略卡 Mallorca, 艾拉維斯 Alaves, 愛斯賓奴 Espanol, 華歷簡奴 Vallecano, 利雲特 Levante, 艾爾切 Elche, 奧維亞度 Oviedo, 拉斯彭馬斯 Las Palmas, 雷加利斯 Leganes, 華拉度列 Valladolid; fall back to the raw name for any unknown).
   - 1X2 decimal odds (主勝 / 和局 / 客勝), implied probability with margin removed (proportional normalisation: p_i = (1/o_i) / Σ(1/o_j)), and the bookmaker margin (overround − 1) shown as %.
   - Favourite (lowest odds) marked 「莊家熱門」.
   - Result hidden.
4. Player picks 主勝 / 和局 / 客勝 (big tap buttons). Optional exact-score guess (two small number steppers 0–9, default off/blank) for bonus.
5. Stake fixed 10 units. 「揭曉」 reveals: final score (and HT score), win/lose, P/L: correct pick → +10×(odds−1), wrong → −10. Exact score correct → bonus +20 units. Bankroll can go negative (show it, no game over).
6. Baseline 「跟莊家熱門」: in parallel, a virtual player always backs the favourite with same stake; show its bankroll each round.
7. 「下一場」 advances. After 10: end screen with player bankroll vs baseline, hit rate (x/10), exact-score hits, ROI %, per-match recap list (match, your pick, result, P/L), verdict text (贏咗莊家 / 輸畀莊家 / 打和), 「再玩一轉」 replay and 「返主頁」.
8. Best score = highest final bankroll stored in localStorage (`btb_best`), handle localStorage unavailable (file:// sandbox / private mode) gracefully with try/catch.

## UI
- All user-facing text in Cantonese (Traditional Chinese, 廣東話 tone). `<html lang="zh-Hant-HK">`.
- Mobile-first, works 360px wide up to desktop; football theme (pitch green stripes, scoreboard style, white/gold accents). No external assets; CSS/emoji/SVG only.
- Accessible: buttons are real `<button>`, visible focus, sufficient contrast, keyboard usable (1/X/2 keys optional).
- No console errors or warnings.

## Non-goals
No real money, no network, no frameworks/build step.
