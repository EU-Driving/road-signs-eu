# Road Signs API

REST API for Vienna Convention road signs: categories, signs, composite panels, and country images.

## Setup

```bash
cd api
npm install
```

Optional configuration (e.g. port, database URL) can be provided via environment variables or a local config file in the project root. **Never commit files that contain API keys, passwords, or connection strings.** See `.gitignore` for excluded paths.

## Run

```bash
npm start
```

Dev mode with auto-reload:

```bash
npm run dev
```

Server runs on `http://localhost:3000` by default.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/signs/categories` | List all sign categories |
| GET | `/api/signs?category=VIENNA-A` | Category content (signs + declinations). Add `&light=true` for minimal payload |
| GET | `/api/signs?reference=VIENNA-A1a` | Single sign by Vienna reference. Response includes `compositeCountries`: list of country codes (e.g. `dk`) where this sign has at least one composite panel. |
| GET | `/api/signs/composite?country=de&reference=DE-103-10` | One composite panel |
| GET | `/api/signs/composite/all` | All composites (built from `road_signs_all.json`, keyed by `country\|signRef\|declinationCode`) |
| PUT | `/api/signs/composite` | Update composite in main JSON. Body: `{ country, nationalId, positions, signReference, declinationCode }` (all required). Writes to `road_signs_all.json` in the sign’s declination `localizations[country].position`. |
| DELETE | `/api/signs/composite?country=de&reference=DE-103-10` | Set that composite to single panel `{ center: reference }` in main JSON. |
| GET | `/api/signs/country-images?country=de` | List image references (no extension) for a country |
| POST | `/api/signs/upload-image` | Upload image. Multipart: `country`, `reference`, `file` |
| PATCH | `/api/signs/declination-name` | Set display name for a declination. Body: `{ signReference, declinationCode, name }` |

## Data (template format)

- **Signs & composites**: single source `../vienna-convention/road_signs_all.json`. Each localization is `{ position: { center?, left1?, right1?, ... } }` (template format). Composites are stored in the same file.
- **Images**: served from `../countries/<folder>/` (e.g. `countries/germany/DE-103-10.svg`)

## Tests

```bash
npm test
```

## Errors

Responses use `{ success: false, message: "..." }`. HTTP status: 400 (bad request), 404 (not found), 500 (server error).
