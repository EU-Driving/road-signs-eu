const path = require('path');
const fs = require('fs');

const SIGNS_JSON_PATH = process.env.SIGNS_JSON_PATH
  ? path.resolve(process.env.SIGNS_JSON_PATH)
  : path.join(__dirname, '../../vienna-convention/road_signs_all.json');

let cache = null;

/** Normalize localization to template format: { position: { center?, left1?, ... } } */
function normalizeLocalization(loc) {
  if (!loc || typeof loc !== 'object') return { position: {} };
  if (loc.position && typeof loc.position === 'object' && !Array.isArray(loc.position)) {
    return { position: loc.position };
  }
  const ref = loc.reference;
  if (ref) return { position: { center: ref } };
  return { position: {} };
}

/** Get reference from a localization (template or old format) */
function getReferenceFromLoc(loc) {
  if (!loc) return null;
  if (loc.reference) return loc.reference;
  const pos = loc.position;
  if (pos && typeof pos === 'object' && pos.center) return pos.center;
  if (pos && typeof pos === 'object') {
    const keys = ['center', 'left1', 'left2', 'left3', 'right1', 'right2', 'right3', 'top1', 'top2', 'top3', 'bottom1', 'bottom2', 'bottom3'];
    for (const k of keys) { if (pos[k]) return pos[k]; }
  }
  return null;
}

function loadSignsData(skipCache = false) {
  if (skipCache) cache = null;
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(SIGNS_JSON_PATH, 'utf-8');
    cache = JSON.parse(raw);
    return cache;
  } catch (e) {
    return { categories: [] };
  }
}

function saveSignsData(data) {
  const dir = path.dirname(SIGNS_JSON_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SIGNS_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
  cache = data;
}

function invalidateSignsCache() {
  cache = null;
}

/** Find sign and declination by reference and declination code (or _idx_N). Returns { cat, sign, dec, catIdx, signIdx, decIdx } or null. */
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
        if (code === decCode) return { cat, sign, dec, catIdx: ci, signIdx: si, decIdx: di };
      }
    }
  }
  return null;
}

module.exports = {
  SIGNS_JSON_PATH,
  normalizeLocalization,
  getReferenceFromLoc,
  loadSignsData,
  saveSignsData,
  invalidateSignsCache,
  findSignDeclination
};
