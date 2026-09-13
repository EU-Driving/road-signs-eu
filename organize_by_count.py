#!/usr/bin/env python3
"""
Divise les pays avec plus de 150 panneaux en sous-dossiers
pour optimiser la performance du site
"""
import os
import shutil
from pathlib import Path

COUNTRIES_PATH = Path(__file__).resolve().parent / 'countries'
IMAGES_PER_FOLDER = 150

def organize_country(country_path, country_name):
    """Divise les images d'un pays en sous-dossiers"""
    images = sorted([
        f for f in os.listdir(country_path)
        if f.lower().endswith(('.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp'))
    ])

    if len(images) <= IMAGES_PER_FOLDER:
        print(f"✓ {country_name}: {len(images)} images (OK, pas besoin de diviser)")
        return

    print(f"🔄 {country_name}: {len(images)} images → Division en sous-dossiers...")

    # Créer les sous-dossiers et déplacer les images
    folder_index = 1
    for i in range(0, len(images), IMAGES_PER_FOLDER):
        batch = images[i:i + IMAGES_PER_FOLDER]
        subfolder = country_path / f'signs_{folder_index}'

        # Créer le dossier s'il n'existe pas
        subfolder.mkdir(exist_ok=True)

        # Déplacer les images
        for img in batch:
            src = country_path / img
            dst = subfolder / img
            if src.is_file() and not dst.exists():
                shutil.move(str(src), str(dst))
                print(f"  → {img} vers signs_{folder_index}/")

        folder_index += 1

    print(f"✓ {country_name}: Division terminée ({folder_index - 1} dossiers créés)\n")


if __name__ == '__main__':
    countries_with_many = [
        'germany', 'slovakia', 'france', 'finland', 'spain',
        'poland', 'hungary', 'latvia', 'denmark', 'lithuania',
        'belgium', 'czech-republic', 'bulgaria', 'sweden',
        'portugal', 'austria', 'estonia'
    ]

    for country in countries_with_many:
        country_path = COUNTRIES_PATH / country
        if country_path.exists():
            organize_country(country_path, country)

    print("✓ Organisation terminée!")
