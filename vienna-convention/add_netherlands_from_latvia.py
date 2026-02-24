#!/usr/bin/env python3
"""
Ajoute les panneaux Pays-Bas (nl) dans road_signs_all.json en se basant sur
les panneaux Lettonie (lv) : utilise road_signs_eu.json pour faire le lien
LV -> NL, puis pour chaque localisation "lv" qui a un équivalent NL,
ajoute la localisation "nl".
"""
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
ROAD_SIGNS_ALL = SCRIPT_DIR / "road_signs_all.json"
ROAD_SIGNS_EU = ROOT / "data_from_wiki" / "road_signs_eu.json"


def build_lv_to_nl(wiki):
    """Construit le mapping national_id Lettonie -> national_id Pays-Bas."""
    lv_to_nl = {}
    for category, signs in wiki.items():
        if not isinstance(signs, dict):
            continue
        for sign_key, data in signs.items():
            if not isinstance(data, dict):
                continue
            lv_info = data.get("lv")
            nl_info = data.get("nl")
            if isinstance(lv_info, dict) and isinstance(nl_info, dict):
                lv_id = (lv_info.get("national_id") or "").strip()
                nl_id = (nl_info.get("national_id") or "").strip()
                if lv_id and nl_id:
                    if lv_id not in lv_to_nl:
                        lv_to_nl[lv_id] = nl_id
    return lv_to_nl


def add_nl_to_localizations(localizations, lv_to_nl):
    """Si localizations contient 'lv' avec un center mappé, ajoute 'nl'."""
    if not isinstance(localizations, dict):
        return 0
    lv_loc = localizations.get("lv")
    if not isinstance(lv_loc, dict):
        return 0
    pos = lv_loc.get("position") or {}
    center = (pos.get("center") or "").strip()
    if not center or center not in lv_to_nl:
        return 0
    if "nl" in localizations:
        return 0
    nl_id = lv_to_nl[center]
    new_loc = {}
    for k, v in localizations.items():
        new_loc[k] = v
        if k == "lv":
            new_loc["nl"] = {"position": {"center": nl_id}}
    localizations.clear()
    localizations.update(new_loc)
    return 1


def process_sign(sign, lv_to_nl, stats):
    """Traite un signe : parcourt ses déclinaisons et leurs localisations."""
    declinations = sign.get("declinations") or []
    for decl in declinations:
        if not isinstance(decl, dict):
            continue
        locs = decl.get("localizations")
        if not locs:
            continue
        stats["added"] += add_nl_to_localizations(locs, lv_to_nl)


def main():
    if not ROAD_SIGNS_EU.exists():
        print(f"Fichier introuvable: {ROAD_SIGNS_EU}")
        return
    if not ROAD_SIGNS_ALL.exists():
        print(f"Fichier introuvable: {ROAD_SIGNS_ALL}")
        return

    with open(ROAD_SIGNS_EU, encoding="utf-8") as f:
        wiki = json.load(f)
    with open(ROAD_SIGNS_ALL, encoding="utf-8") as f:
        vienna = json.load(f)

    lv_to_nl = build_lv_to_nl(wiki)
    print(f"Mapping LV -> NL: {len(lv_to_nl)} entrées")

    stats = {"added": 0}
    categories = vienna.get("categories") or []
    for cat in categories:
        for sign in cat.get("signs") or []:
            process_sign(sign, lv_to_nl, stats)

    print(f"Localisations 'nl' ajoutées: {stats['added']}")

    with open(ROAD_SIGNS_ALL, "w", encoding="utf-8") as f:
        json.dump(vienna, f, ensure_ascii=False, indent=2)

    print("Fichier road_signs_all.json mis à jour.")


if __name__ == "__main__":
    main()
