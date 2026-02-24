#!/usr/bin/env python3
"""
Ajoute les panneaux Hongrie (hu) dans road_signs_all.json en se basant sur
les panneaux France : utilise road_signs_eu.json pour faire le lien FR -> HU,
puis pour chaque localisation "fr" dans road_signs_all.json qui a un équivalent
HU, ajoute la localisation "hu".
"""
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
ROAD_SIGNS_ALL = SCRIPT_DIR / "road_signs_all.json"
ROAD_SIGNS_EU = ROOT / "data_from_wiki" / "road_signs_eu.json"


def build_fr_to_hu(wiki):
    """Construit le mapping national_id France -> national_id Hongrie."""
    fr_to_hu = {}
    for category, signs in wiki.items():
        if not isinstance(signs, dict):
            continue
        for sign_key, data in signs.items():
            if not isinstance(data, dict):
                continue
            fr_info = data.get("fr")
            hu_info = data.get("hu")
            if isinstance(fr_info, dict) and isinstance(hu_info, dict):
                fr_id = (fr_info.get("national_id") or "").strip()
                hu_id = (hu_info.get("national_id") or "").strip()
                if fr_id and hu_id:
                    # Un même FR peut apparaître pour plusieurs signes (ex. cédez le passage)
                    # On garde la première correspondance HU
                    if fr_id not in fr_to_hu:
                        fr_to_hu[fr_id] = hu_id
    return fr_to_hu


def add_hu_to_localizations(localizations, fr_to_hu):
    """Si localizations contient 'fr' avec un center mappé, ajoute 'hu'."""
    if not isinstance(localizations, dict):
        return 0
    fr_loc = localizations.get("fr")
    if not isinstance(fr_loc, dict):
        return 0
    pos = fr_loc.get("position") or {}
    center = (pos.get("center") or "").strip()
    if not center or center not in fr_to_hu:
        return 0
    if "hu" in localizations:
        return 0
    hu_id = fr_to_hu[center]
    # Insérer "hu" après "fr" pour lisibilité (ordre des clés)
    new_loc = {}
    for k, v in localizations.items():
        new_loc[k] = v
        if k == "fr":
            new_loc["hu"] = {"position": {"center": hu_id}}
    localizations.clear()
    localizations.update(new_loc)
    return 1


def process_sign(sign, fr_to_hu, stats):
    """Traite un signe : parcourt ses déclinaisons et leurs localisations."""
    declinations = sign.get("declinations") or []
    for decl in declinations:
        if not isinstance(decl, dict):
            continue
        locs = decl.get("localizations")
        if not locs:
            continue
        stats["added"] += add_hu_to_localizations(locs, fr_to_hu)


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

    fr_to_hu = build_fr_to_hu(wiki)
    print(f"Mapping FR -> HU: {len(fr_to_hu)} entrées")

    stats = {"added": 0}
    categories = vienna.get("categories") or []
    for cat in categories:
        for sign in cat.get("signs") or []:
            process_sign(sign, fr_to_hu, stats)

    print(f"Localisations 'hu' ajoutées: {stats['added']}")

    with open(ROAD_SIGNS_ALL, "w", encoding="utf-8") as f:
        json.dump(vienna, f, ensure_ascii=False, indent=2)

    print("Fichier road_signs_all.json mis à jour.")


if __name__ == "__main__":
    main()
