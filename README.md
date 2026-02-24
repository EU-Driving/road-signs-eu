# Road Signs – Vienna Convention

Web interface and REST API to browse and manage road signs from the Vienna Convention, by country (EU 27).

## Contents

- **API** (`api/`): Node.js/Express REST server for categories, signs, composite panels, and country images.
- **Website** (`website/`): Table by category, sticky legend column, horizontal scroll, sign detail and composite panel editing.

## Quick start

### 1. API

```bash
cd api
npm install
npm start
```

The server listens on `http://localhost:3000` by default. Optional configuration (e.g. port) can be set via environment or a local config file; see [api/README.md](api/README.md). **Do not commit any file that contains API keys, passwords, or connection strings.**

### 2. Website

Open `website/index.html` in a browser (or serve the folder via the API). If the API runs on the same origin, the API URL field can be left empty (the field is hidden by default).

## Table

- **Category**: Vienna category (e.g. VIENNA-A).
- **Merge versions**: one row per sign or one row per declination.
- **One image per cell**: single image per cell or all variants.
- The **first column (legend)** stays fixed on horizontal scroll; the rest of the table scrolls.

## Data

- Signs and composites: `vienna-convention/road_signs_all.json`.
- Images: `countries/<country_folder>/` (e.g. `countries/germany/DE-103-10.svg`).

## API documentation

See [api/README.md](api/README.md) for endpoints and response format.
