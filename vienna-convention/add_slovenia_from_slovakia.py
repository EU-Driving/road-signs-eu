#!/usr/bin/env python3
"""
Ajoute les panneaux Slovénie (si) dans road_signs_all.json en se basant sur
les panneaux Slovaquie (sk) : utilise road_signs_eu.json pour faire le lien
SK -> SI, puis pour chaque localisation "sk" qui a un équivalent SI,
ajoute la localisation "si".
"""
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
ROAD_SIGNS_ALL = SCRIPT_DIR / "road_signs_all.json"
ROAD_SIGNS_EU = ROOT / "data_from_wiki" / "road_signs_eu.json"


def build_sk_to_si(wiki):
    """Construit le mapping national_id Slovaquie -> national_id Slovénie."""
    sk_to_si = {}
    for category, signs in wiki.items():
        if not isinstance(signs, dict):
            continue
        for sign_key, data in signs.items():
            if not isinstance(data, dict):
                continue
            sk_info = data.get("sk")
            si_info = data.get("si")
            if isinstance(sk_info, dict) and isinstance(si_info, dict):
                sk_id = (sk_info.get("national_id") or "").strip()
                si_id = (si_info.get("national_id") or "").strip()
                if sk_id and si_id:
                    if sk_id not in sk_to_si:
                        sk_to_si[sk_id] = si_id
    return sk_to_si


def add_si_to_localizations(localizations, sk_to_si):
    """Si localizations contient 'sk' avec un center mappé, ajoute 'si'."""
    if not isinstance(localizations, dict):
        return 0
    sk_loc = localizations.get("sk")
    if not isinstance(sk_loc, dict):
        return 0
    pos = sk_loc.get("position") or {}
    center = (pos.get("center") or "").strip()
    if not center or center not in sk_to_si:
        return 0
    if "si" in localizations:
        return 0
    si_id = sk_to_si[center]
    new_loc = {}
    for k, v in localizations.items():
        new_loc[k] = v
        if k == "sk":
            new_loc["si"] = {"position": {"center": si_id}}
    localizations.clear()
    localizations.update(new_loc)
    return 1


def process_sign(sign, sk_to_si, stats):
    """Traite un signe : parcourt ses déclinaisons et leurs localisations."""
    declinations = sign.get("declinations") or []
    for decl in declinations:
        if not isinstance(decl, dict):
            continue
        locs = decl.get("localizations")
        if not locs:
            continue
        stats["added"] += add_si_to_localizations(locs, sk_to_si)


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

    sk_to_si = build_sk_to_si(wiki)
    print(f"Mapping SK -> SI: {len(sk_to_si)} entrées")

    stats = {"added": 0}
    categories = vienna.get("categories") or []
    for cat in categories:
        for sign in cat.get("signs") or []:
            process_sign(sign, sk_to_si, stats)

    print(f"Localisations 'si' ajoutées: {stats['added']}")

    with open(ROAD_SIGNS_ALL, "w", encoding="utf-8") as f:
        json.dump(vienna, f, ensure_ascii=False, indent=2)

    print("Fichier road_signs_all.json mis à jour.")


if __name__ == "__main__":
    main()
