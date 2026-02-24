#!/usr/bin/env node
/**
 * Merges composite-signs.json into road_signs_all.json.
 * Keys in composite-signs: country|signReference|declinationCode
 * For each entry, sets sign.declinations[].localizations[country].position in road_signs_all.json.
 */
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const SIGNS_PATH = path.join(ROOT, 'vienna-convention/road_signs_all.json');
const COMPOSITE_PATH = path.join(ROOT, 'vienna-convention/composite-signs.json');

function findSignDeclination(data, signReference, declinationCode) {
  const ref = (signReference || '').trim().toLowerCase();
  const decCode = declinationCode !== undefined && declinationCode !== null ? String(declinationCode).trim() : '';
  const categories = data.categories || [];
  for (let ci = 0; ci < categories.length; ci++) {
    const cat = categories[ci];
    const signs = cat.signs || [];
    for (let si = 0; si < signs.length; si++) {
      const sign = signs[si];
      if (!sign.reference || sign.reference.toLowerCase() !== ref) continue;
      const declinations = sign.declinations || [];
      for (let di = 0; di < declinations.length; di++) {
        const dec = declinations[di];
        const code = (dec.code != null && String(dec.code).trim() !== '') ? String(dec.code) : ('_idx_' + di);
        if (code === decCode) return { dec };
      }
    }
  }
  return null;
}

const signsRaw = fs.readFileSync(SIGNS_PATH, 'utf-8');
const data = JSON.parse(signsRaw);

let composite = {};
try {
  const compositeRaw = fs.readFileSync(COMPOSITE_PATH, 'utf-8');
  composite = JSON.parse(compositeRaw);
} catch (e) {
  console.log('No composite-signs.json or empty:', e.message);
  process.exit(0);
}

const keys = Object.keys(composite);
if (keys.length === 0) {
  console.log('composite-signs.json is empty. Nothing to merge.');
  process.exit(0);
}

let merged = 0;
let skipped = 0;

keys.forEach((key) => {
  const parts = key.split('|');
  if (parts.length < 3) return;
  const [country, signRef, decCode] = parts;
  const entry = composite[key];
  if (!entry || !entry.positions || typeof entry.positions !== 'object') return;
  const found = findSignDeclination(data, signRef, decCode);
  if (!found) {
    skipped++;
    console.warn('Skip (sign/declination not found):', key);
    return;
  }
  if (!found.dec.localizations) found.dec.localizations = {};
  found.dec.localizations[country] = { position: entry.positions };
  merged++;
});

fs.writeFileSync(SIGNS_PATH, JSON.stringify(data, null, 2), 'utf-8');
console.log('Merged', merged, 'composite(s) into road_signs_all.json. Skipped:', skipped);

fs.writeFileSync(COMPOSITE_PATH, '{}', 'utf-8');
console.log('Emptied composite-signs.json (data is now in road_signs_all.json).');
