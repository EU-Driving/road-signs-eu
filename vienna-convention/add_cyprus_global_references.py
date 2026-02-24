#!/usr/bin/env python3
"""
Ajoute Chypre (cy) dans road_signs_all.json en utilisant les références
globales Vienna comme identifiant des panneaux (car Chypre utilise les mêmes
signes que la convention). Pour chaque déclinaison qui a des localisations,
on ajoute "cy" avec position.center = la référence du signe (ex. VIENNA-A1a).
"""
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ROAD_SIGNS_ALL = SCRIPT_DIR / "road_signs_all.json"


def add_cy_to_localizations(localizations, sign_reference):
    """Ajoute 'cy' avec la référence globale (Vienna) comme center."""
    if not isinstance(localizations, dict):
        return 0
    if "cy" in localizations:
        return 0
    ref = (sign_reference or "").strip()
    if not ref:
        return 0
    new_loc = {}
    for k, v in localizations.items():
        new_loc[k] = v
        # Insérer "cy" après "at" pour ordre alphabétique cohérent
        if k == "at":
            new_loc["cy"] = {"position": {"center": ref}}
    if "cy" not in new_loc:
        new_loc["cy"] = {"position": {"center": ref}}
    localizations.clear()
    localizations.update(new_loc)
    return 1


def process_sign(sign, stats):
    """Pour chaque déclinaison avec localisations, ajoute cy avec ref globale."""
    ref = sign.get("reference") or ""
    declinations = sign.get("declinations") or []
    for decl in declinations:
        if not isinstance(decl, dict):
            continue
        locs = decl.get("localizations")
        if not locs:
            continue
        stats["added"] += add_cy_to_localizations(locs, ref)


def main():
    if not ROAD_SIGNS_ALL.exists():
        print(f"Fichier introuvable: {ROAD_SIGNS_ALL}")
        return

    with open(ROAD_SIGNS_ALL, encoding="utf-8") as f:
        vienna = json.load(f)

    stats = {"added": 0}
    for cat in vienna.get("categories") or []:
        for sign in cat.get("signs") or []:
            process_sign(sign, stats)

    print(f"Localisations 'cy' (référence globale Vienna) ajoutées: {stats['added']}")

    with open(ROAD_SIGNS_ALL, "w", encoding="utf-8") as f:
        json.dump(vienna, f, ensure_ascii=False, indent=2)

    print("Fichier road_signs_all.json mis à jour.")


if __name__ == "__main__":
    main()
