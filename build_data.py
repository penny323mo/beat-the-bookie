#!/usr/bin/env python3
"""
build_data.py - Lean data generator for Beat the Bookie (v2)
Processes:
- 5 Leagues (EPL, La Liga, Serie A, Bundesliga, Ligue 1) from raw/{LEAGUE}_{SEASON}.csv
- 3 Cups (UCL, UEL, UECL) from raw/footiqo_europe-*.json
Produces:
- data/meta.js (competitions, seasons, schema, counts, all teams)
- data/{epl,laliga,seriea,bundesliga,ligue1,ucl,uel,uecl}.js (compact match arrays)
"""

import csv
import json
import os
import sys
from team_names import TEAM_NAMES

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(SCRIPT_DIR, "raw")
DATA_DIR = os.path.join(SCRIPT_DIR, "data")

SEASONS = [
    "2021/22",
    "2022/23",
    "2023/24",
    "2024/25",
    "2025/26"
]

SEASON_CODE_TO_IDX = {
    "2122": 0,
    "2223": 1,
    "2324": 2,
    "2425": 3,
    "2526": 4
}

CUP_SEASON_TO_IDX = {
    "2021/2022": 0,
    "2022/2023": 1,
    "2023/2024": 2,
    "2024/2025": 3,
    "2025/2026": 4
}

LEAGUES = [
    {"id": "epl", "code": "E0", "name": "英超", "fullName": "英格蘭超級聯賽", "type": "league", "hasAH": True},
    {"id": "laliga", "code": "SP1", "name": "西甲", "fullName": "西班牙甲組聯賽", "type": "league", "hasAH": True},
    {"id": "seriea", "code": "I1", "name": "意甲", "fullName": "意大利甲組聯賽", "type": "league", "hasAH": True},
    {"id": "bundesliga", "code": "D1", "name": "德甲", "fullName": "德國甲組聯賽", "type": "league", "hasAH": True},
    {"id": "ligue1", "code": "F1", "name": "法甲", "fullName": "法國甲組聯賽", "type": "league", "hasAH": True}
]

CUPS = [
    {"id": "ucl", "file": "footiqo_europe-champions-league.json", "name": "歐聯", "fullName": "歐洲聯賽冠軍盃", "type": "cup", "hasAH": False},
    {"id": "uel", "file": "footiqo_europe-europa-league.json", "name": "歐霸", "fullName": "歐霸盃", "type": "cup", "hasAH": False},
    {"id": "uecl", "file": "footiqo_europe-conference-league.json", "name": "歐協聯", "fullName": "歐洲協會聯賽", "type": "cup", "hasAH": False}
]

SCHEMA = [
    "h_idx", "a_idx", "date", "season_idx",
    "fthg", "ftag", "ftr", "hthg", "htag",
    "o1x2_h", "o1x2_d", "o1x2_a", "o1x2_bk",
    "c1x2_h", "c1x2_d", "c1x2_a", "c1x2_bk",
    "oah_line", "oah_h", "oah_a", "oah_bk",
    "cah_line", "cah_h", "cah_a", "cah_bk"
]

def parse_num(v):
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    try:
        f = float(s)
        return round(f, 2)
    except (ValueError, TypeError):
        return None

def parse_int(v):
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    try:
        return int(s)
    except (ValueError, TypeError):
        return None

def process_league(comp_info):
    comp_id = comp_info["id"]
    code = comp_info["code"]
    
    teams_list = []
    teams_map = {}
    matches = []
    
    # Counts per season: { season_idx: { total: 0, ah: 0 } }
    season_counts = {
        i: {"total": 0, "ah": 0, "open1x2": 0, "close1x2": 0, "openAH": 0, "closeAH": 0}
        for i in range(len(SEASONS))
    }
    
    for s_code, s_idx in SEASON_CODE_TO_IDX.items():
        csv_path = os.path.join(RAW_DIR, f"{code}_{s_code}.csv")
        if not os.path.exists(csv_path):
            print(f"Warning: {csv_path} not found!", file=sys.stderr)
            continue
            
        with open(csv_path, "r", encoding="utf-8-sig", errors="ignore") as fp:
            reader = csv.DictReader(fp)
            for row in reader:
                home = (row.get("HomeTeam") or "").strip()
                away = (row.get("AwayTeam") or "").strip()
                if not home or not away:
                    continue
                    
                fthg = parse_int(row.get("FTHG"))
                ftag = parse_int(row.get("FTAG"))
                ftr = (row.get("FTR") or "").strip().upper()
                if fthg is None or ftag is None or ftr not in ("H", "D", "A"):
                    continue
                    
                if home not in teams_map:
                    teams_map[home] = len(teams_list)
                    teams_list.append({"en": home, "zh": TEAM_NAMES.get(home, home)})
                if away not in teams_map:
                    teams_map[away] = len(teams_list)
                    teams_list.append({"en": away, "zh": TEAM_NAMES.get(away, away)})
                    
                h_idx = teams_map[home]
                a_idx = teams_map[away]
                
                # Parse date DD/MM/YYYY into YYYYMMDD int
                date_str = (row.get("Date") or "").strip()
                date_parts = date_str.split("/")
                date_int = 0
                if len(date_parts) == 3:
                    try:
                        d, m, y = int(date_parts[0]), int(date_parts[1]), int(date_parts[2])
                        if y < 100:
                            y += 2000
                        date_int = y * 10000 + m * 100 + d
                    except ValueError:
                        date_int = 0
                        
                hthg = parse_int(row.get("HTHG"))
                htag = parse_int(row.get("HTAG"))
                
                # Opening 1X2: B365 -> Avg -> PS
                o1x2_h, o1x2_d, o1x2_a, o1x2_bk = None, None, None, None
                for bk, pref in [("B365", "B365"), ("Avg", "Avg"), ("PS", "PS")]:
                    h_val = parse_num(row.get(f"{pref}H"))
                    d_val = parse_num(row.get(f"{pref}D"))
                    a_val = parse_num(row.get(f"{pref}A"))
                    if h_val and d_val and a_val and h_val > 0 and d_val > 0 and a_val > 0:
                        o1x2_h, o1x2_d, o1x2_a, o1x2_bk = h_val, d_val, a_val, bk
                        break
                        
                # Closing 1X2: B365C -> AvgC -> PSC
                c1x2_h, c1x2_d, c1x2_a, c1x2_bk = None, None, None, None
                for bk, pref in [("B365", "B365C"), ("Avg", "AvgC"), ("PS", "PSC")]:
                    h_val = parse_num(row.get(f"{pref}H"))
                    d_val = parse_num(row.get(f"{pref}D"))
                    a_val = parse_num(row.get(f"{pref}A"))
                    if h_val and d_val and a_val and h_val > 0 and d_val > 0 and a_val > 0:
                        c1x2_h, c1x2_d, c1x2_a, c1x2_bk = h_val, d_val, a_val, bk
                        break
                        
                # Opening AH: AHh line + B365AHH/AHA -> AvgAHH/AvgAHA
                oah_line, oah_h, oah_a, oah_bk = None, None, None, None
                raw_oline = parse_num(row.get("AHh"))
                if raw_oline is not None:
                    for bk, pref in [("B365", "B365AH"), ("Avg", "AvgAH")]:
                        h_val = parse_num(row.get(f"{pref}H"))
                        a_val = parse_num(row.get(f"{pref}A"))
                        if h_val and a_val and h_val > 0 and a_val > 0:
                            oah_line, oah_h, oah_a, oah_bk = raw_oline, h_val, a_val, bk
                            break
                            
                # Closing AH: AHCh line + B365CAHH/CAHA -> AvgCAHH/AvgCAHA
                cah_line, cah_h, cah_a, cah_bk = None, None, None, None
                raw_cline = parse_num(row.get("AHCh"))
                if raw_cline is not None:
                    for bk, pref in [("B365", "B365CAH"), ("Avg", "AvgCAH")]:
                        h_val = parse_num(row.get(f"{pref}H"))
                        a_val = parse_num(row.get(f"{pref}A"))
                        if h_val and a_val and h_val > 0 and a_val > 0:
                            cah_line, cah_h, cah_a, cah_bk = raw_cline, h_val, a_val, bk
                            break
                            
                has_o1x2 = (o1x2_h is not None and o1x2_d is not None and o1x2_a is not None)
                has_c1x2 = (c1x2_h is not None and c1x2_d is not None and c1x2_a is not None)
                has_oah = (oah_line is not None and oah_h is not None and oah_a is not None)
                has_cah = (cah_line is not None and cah_h is not None and cah_a is not None)
                has_ah = has_oah or has_cah

                # Row must have at least one valid 1X2 market
                if not (has_o1x2 or has_c1x2):
                    continue

                season_counts[s_idx]["total"] += 1
                if has_ah:
                    season_counts[s_idx]["ah"] += 1
                if has_o1x2:
                    season_counts[s_idx]["open1x2"] += 1
                if has_c1x2:
                    season_counts[s_idx]["close1x2"] += 1
                if has_oah:
                    season_counts[s_idx]["openAH"] += 1
                if has_cah:
                    season_counts[s_idx]["closeAH"] += 1
                    
                match_tuple = [
                    h_idx, a_idx, date_int, s_idx, fthg, ftag, ftr, hthg, htag,
                    o1x2_h, o1x2_d, o1x2_a, o1x2_bk,
                    c1x2_h, c1x2_d, c1x2_a, c1x2_bk,
                    oah_line, oah_h, oah_a, oah_bk,
                    cah_line, cah_h, cah_a, cah_bk
                ]
                matches.append(match_tuple)
                
    return {
        "teams": teams_list,
        "matches": matches,
        "counts": season_counts
    }

def process_cup(comp_info):
    comp_id = comp_info["id"]
    file_name = comp_info["file"]
    json_path = os.path.join(RAW_DIR, file_name)
    
    if not os.path.exists(json_path):
        print(f"Warning: {json_path} not found!", file=sys.stderr)
        return {"teams": [], "matches": [], "counts": {}}
        
    with open(json_path, "r", encoding="utf-8") as fp:
        cup_data = json.load(fp)
        
    # Build odds dict from odds table blocks
    odds_dict = {}
    for b in cup_data.get("odds", []):
        cols = b["cols"]
        id_i = cols.index("id")
        h_i = cols.index("H")
        d_i = cols.index("D")
        a_i = cols.index("A")
        for r in b["rows"]:
            odds_dict[r[id_i]] = (parse_num(r[h_i]), parse_num(r[d_i]), parse_num(r[a_i]))
            
    teams_list = []
    teams_map = {}
    matches = []
    season_counts = {
        i: {"total": 0, "ah": 0, "open1x2": 0, "close1x2": 0, "openAH": 0, "closeAH": 0}
        for i in range(len(SEASONS))
    }
    
    for b in cup_data.get("res", []):
        cols = b["cols"]
        id_i = cols.index("id")
        s_i = cols.index("Season")
        d_i = cols.index("matchDate")
        h_i = cols.index("homeTeam")
        a_i = cols.index("awayTeam")
        fthg_i = cols.index("FTHG")
        ftag_i = cols.index("FTAG")
        ftr_i = cols.index("FTR")
        
        for r in b["rows"]:
            season_str = str(r[s_i]).strip()
            if season_str not in CUP_SEASON_TO_IDX:
                continue
            s_idx = CUP_SEASON_TO_IDX[season_str]
            
            home = str(r[h_i]).strip()
            away = str(r[a_i]).strip()
            if not home or not away:
                continue
                
            fthg = parse_int(r[fthg_i])
            ftag = parse_int(r[ftag_i])
            ftr = str(r[ftr_i]).strip().upper()
            if fthg is None or ftag is None or ftr not in ("H", "D", "A"):
                continue
                
            if home not in teams_map:
                teams_map[home] = len(teams_list)
                teams_list.append({"en": home, "zh": TEAM_NAMES.get(home, home)})
            if away not in teams_map:
                teams_map[away] = len(teams_list)
                teams_list.append({"en": away, "zh": TEAM_NAMES.get(away, away)})
                
            h_idx = teams_map[home]
            a_idx = teams_map[away]
            
            # Date DD-MM-YY HH:MM
            date_str = str(r[d_i]).split()[0]
            date_parts = date_str.split("-")
            date_int = 0
            if len(date_parts) == 3:
                try:
                    d, m, y = int(date_parts[0]), int(date_parts[1]), int(date_parts[2])
                    full_yr = 2000 + y if y < 100 else y
                    date_int = full_yr * 10000 + m * 100 + d
                except ValueError:
                    date_int = 0
                    
            hthg = None
            htag = None
            
            # Closing 1X2 from 1xBet (require complete 1X2 odds)
            mid = r[id_i]
            c1x2_h, c1x2_d, c1x2_a = odds_dict.get(mid, (None, None, None))
            if c1x2_h is None or c1x2_d is None or c1x2_a is None or c1x2_h <= 0 or c1x2_d <= 0 or c1x2_a <= 0:
                continue
            c1x2_bk = "1xBet"
            
            season_counts[s_idx]["total"] += 1
            season_counts[s_idx]["close1x2"] += 1
            # Cups have NO Asian handicap and NO opening odds
            
            match_tuple = [
                h_idx, a_idx, date_int, s_idx, fthg, ftag, ftr, hthg, htag,
                None, None, None, None,
                c1x2_h, c1x2_d, c1x2_a, c1x2_bk,
                None, None, None, None,
                None, None, None, None
            ]
            matches.append(match_tuple)
            
    return {
        "teams": teams_list,
        "matches": matches,
        "counts": season_counts
    }

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    
    meta_competitions = []
    meta_counts = {}
    meta_teams_dict = {}
    file_size_table = []
    total_bytes = 0
    total_matches_all = 0
    
    all_comps = LEAGUES + CUPS
    
    for comp in all_comps:
        comp_id = comp["id"]
        is_league = comp["type"] == "league"
        
        meta_competitions.append({
            "id": comp_id,
            "name": comp["name"],
            "fullName": comp["fullName"],
            "type": comp["type"],
            "hasAH": comp["hasAH"]
        })
        
        if is_league:
            result = process_league(comp)
        else:
            result = process_cup(comp)
            
        teams = result["teams"]
        matches = result["matches"]
        counts = result["counts"]
        
        meta_counts[comp_id] = counts
        total_matches_all += len(matches)
        
        # Track team appearance in competitions
        for t in teams:
            en_name = t["en"]
            if en_name not in meta_teams_dict:
                meta_teams_dict[en_name] = {
                    "en": en_name,
                    "zh": t["zh"],
                    "comps": [comp_id]
                }
            else:
                if comp_id not in meta_teams_dict[en_name]["comps"]:
                    meta_teams_dict[en_name]["comps"].append(comp_id)
                    
        # Write JS file for competition
        data_obj = {
            "teams": teams,
            "m": matches
        }
        js_content = f"window.BTB_DATA=window.BTB_DATA||{{}};window.BTB_DATA.{comp_id}=" + \
                     json.dumps(data_obj, separators=(",", ":"), ensure_ascii=False) + ";\n"
                     
        target_js = os.path.join(DATA_DIR, f"{comp_id}.js")
        with open(target_js, "w", encoding="utf-8") as fp:
            fp.write(js_content)
            
        sz = os.path.getsize(target_js)
        total_bytes += sz
        file_size_table.append({
            "comp": comp["name"] + f" ({comp_id})",
            "matches": len(matches),
            "teams": len(teams),
            "file": f"data/{comp_id}.js",
            "bytes": sz,
            "kb": round(sz / 1024, 1)
        })
        
    # Write meta.js
    sorted_teams = sorted(list(meta_teams_dict.values()), key=lambda x: x["zh"])
    meta_obj = {
        "competitions": meta_competitions,
        "seasons": SEASONS,
        "schema": SCHEMA,
        "counts": meta_counts,
        "teams": sorted_teams
    }
    
    meta_content = "window.BTB_META=" + json.dumps(meta_obj, separators=(",", ":"), ensure_ascii=False) + ";\n"
    meta_js = os.path.join(DATA_DIR, "meta.js")
    with open(meta_js, "w", encoding="utf-8") as fp:
        fp.write(meta_content)
        
    meta_sz = os.path.getsize(meta_js)
    total_bytes += meta_sz
    file_size_table.append({
        "comp": "元數據 (meta.js)",
        "matches": total_matches_all,
        "teams": len(sorted_teams),
        "file": "data/meta.js",
        "bytes": meta_sz,
        "kb": round(meta_sz / 1024, 1)
    })
    
    # Print formatted summary table
    print("\n" + "=" * 80)
    print("Beat the Bookie v2 - 數據生成報告 (Data Generation Report)")
    print("=" * 80)
    
    # Table 1: Match counts per competition and season
    print("\n【比賽場數統計 (Match Counts per Competition & Season)】")
    header = f"{'賽事 (Comp)':<16} | " + " | ".join([f"{s:>7}" for s in SEASONS]) + " | " + f"{'總場數':>7} | {'AH場數':>7}"
    print("-" * len(header))
    print(header)
    print("-" * len(header))
    
    season_totals = [0] * len(SEASONS)
    season_ah_totals = [0] * len(SEASONS)
    grand_total = 0
    grand_ah_total = 0
    
    for comp in all_comps:
        cid = comp["id"]
        cname = f"{comp['name']} ({cid})"
        row_str = f"{cname:<16} | "
        comp_tot = 0
        comp_ah = 0
        for s_idx in range(len(SEASONS)):
            c_info = meta_counts[cid][s_idx]
            tot = c_info["total"]
            ah = c_info["ah"]
            comp_tot += tot
            comp_ah += ah
            season_totals[s_idx] += tot
            season_ah_totals[s_idx] += ah
            row_str += f"{tot:>7} | "
        comp_ah_str = f"{comp_ah:>7}" if comp["hasAH"] else f"{'N/A':>7}"
        row_str += f"{comp_tot:>7} | {comp_ah_str}"
        grand_total += comp_tot
        grand_ah_total += comp_ah
        print(row_str)
        
    print("-" * len(header))
    summary_row = f"{'總計 (Total)':<16} | " + " | ".join([f"{season_totals[i]:>7}" for i in range(len(SEASONS))]) + f" | {grand_total:>7} | {grand_ah_total:>7}"
    print(summary_row)
    print("-" * len(header))
    
    # Table 2: File sizes
    print("\n【生成檔案大小 (Generated File Sizes)】")
    print(f"{'檔案 (File)':<20} | {'賽事名稱 (Competition)':<22} | {'球隊數':>7} | {'比賽數':>7} | {'大小 (KB)':>10}")
    print("-" * 75)
    for entry in file_size_table:
        print(f"{entry['file']:<20} | {entry['comp']:<22} | {entry['teams']:>7} | {entry['matches']:>7} | {entry['kb']:>9.1f} KB")
    print("-" * 75)
    print(f"全部檔案總大小 (Total Raw Size): {round(total_bytes / 1024, 1)} KB ({round(total_bytes / (1024*1024), 2)} MB)")
    print(f"目標上限 (Target Limit): 1.50 MB -> 符合標準: {'✅ 通過' if total_bytes < 1.5 * 1024 * 1024 else '❌ 超額'}")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    main()
