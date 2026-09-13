#!/usr/bin/env python3
"""
Serveur de sauvegarde en temps réel pour les mappings
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import sys
from urllib.parse import parse_qs

# Chemin vers road_signs_all.json
ROAD_SIGNS_PATH = os.path.join(os.path.dirname(__file__), '..', 'vienna-convention', 'road_signs_all.json')

class MappingHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Sauvegarder les mappings"""
        if self.path == '/save-mapping':
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_response(400)
                self.end_headers()
                return

            body = self.rfile.read(content_length)

            try:
                data = json.loads(body.decode('utf-8'))
                save_mapping(data)

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success'}).encode())

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode())
        else:
            self.send_response(404)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

    def do_OPTIONS(self):
        """Gérer les requêtes CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        """Logs personnalisés - afficher seulement les POST"""
        msg = format % args
        # Afficher seulement les requêtes POST (sauvegarde)
        if 'POST' in msg or 'ERROR' in msg or 'save-mapping' in msg:
            print(f"[{self.client_address[0]}] {msg}")


def save_mapping(data):
    """Sauvegarder les mappings dans road_signs_all.json"""
    with open(ROAD_SIGNS_PATH, 'r', encoding='utf-8') as f:
        road_signs = json.load(f)

    country_code = data.get('country')
    national_id = data.get('national_id')
    vienna_id = data.get('vienna_id')  # C'est maintenant le code de la déclinaison (ex: VIENNA-A1a-Aa-V1)
    remove = data.get('remove', False)

    # Trouver et mettre à jour le mapping dans la déclinaison correspondante
    for category in road_signs['categories']:
        for sign in category['signs']:
            for decl in sign['declinations']:
                if decl.get('code') == vienna_id:
                    if 'localizations' not in decl:
                        decl['localizations'] = {}

                    if remove:
                        # Supprimer le mapping
                        if country_code in decl['localizations']:
                            if 'position' in decl['localizations'][country_code]:
                                if decl['localizations'][country_code]['position'].get('center') == national_id:
                                    del decl['localizations'][country_code]
                    else:
                        # Ajouter/mettre à jour le mapping
                        if country_code not in decl['localizations']:
                            decl['localizations'][country_code] = {}

                        decl['localizations'][country_code]['position'] = {
                            'center': national_id
                        }

    # Sauvegarder
    with open(ROAD_SIGNS_PATH, 'w', encoding='utf-8') as f:
        json.dump(road_signs, f, ensure_ascii=False, indent=2)

    print(f"✓ Mapping sauvegardé: {country_code} {national_id} → {vienna_id}")


if __name__ == '__main__':
    PORT = 8001
    server = HTTPServer(('localhost', PORT), MappingHandler)
    print(f"🚀 Serveur de sauvegarde lancé sur http://localhost:{PORT}")
    print(f"📄 Fichier de destination: {ROAD_SIGNS_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n❌ Serveur arrêté")
        sys.exit(0)
