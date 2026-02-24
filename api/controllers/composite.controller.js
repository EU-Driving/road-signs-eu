const path = require('path');
const fs = require('fs');
const {
  loadSignsData,
  saveSignsData,
  getReferenceFromLoc,
  findSignDeclination
} = require('../data/signs');

const COUNTRY_TO_FOLDER = {
  at: 'austria', be: 'belgium', bg: 'bulgaria', cz: 'czech-republic',
  de: 'germany', dk: 'denmark', ee: 'estonia', es: 'spain', fi: 'finland',
  fr: 'france', lt: 'lithuania', lv: 'latvia', pt: 'portugal',
  se: 'sweden', sk: 'slovakia'
};

const COUNTRIES_DIR = path.join(__dirname, '../../countries');

let compositeWriteQueue = Promise.resolve();
function runCompositeWrite(fn) {
  compositeWriteQueue = compositeWriteQueue.then(fn).catch((err) => {
    console.error('Composite write error:', err);
    throw err;
  });
  return compositeWriteQueue;
}

function placementKey(country, signReference, declinationCode) {
  const c = (country || '').toLowerCase().trim();
  const s = (signReference || '').trim();
  const d = (declinationCode ?? '').toString().trim();
  return c + '|' + s + '|' + d;
}

function compositeKey(country, nationalCode) {
  return (country + '|' + (nationalCode || '').trim()).toLowerCase();
}

function normalizePositions(positions) {
  if (!positions || typeof positions !== 'object') return {};
  const out = {};
  if (positions.center) out.center = positions.center;
  ['left', 'right', 'top', 'bottom'].forEach((dir) => {
    const indices = [];
    for (let i = 1; i <= 3; i++) {
      const k = dir + i;
      if (positions[k]) indices.push({ i, ref: positions[k] });
    }
    indices.sort((a, b) => a.i - b.i);
    indices.forEach((x, idx) => { out[dir + (idx + 1)] = x.ref; });
  });
  return out;
}

/** Build flat composite map from signs data (template format). Key = country|signRef|decCode, value = { nationalId, country, positions }. */
function buildCompositeMapFromSigns(data) {
  const map = {};
  (data.categories || []).forEach((cat) => {
    (cat.signs || []).forEach((sign) => {
      const signRef = sign.reference || '';
      (sign.declinations || []).forEach((dec, decIdx) => {
        const decCode = (dec.code != null && String(dec.code).trim() !== '') ? String(dec.code) : ('_idx_' + decIdx);
        const locs = dec.localizations || {};
        Object.keys(locs).forEach((cc) => {
          const loc = locs[cc];
          const pos = loc && loc.position && typeof loc.position === 'object' ? loc.position : {};
          const ref = getReferenceFromLoc(loc);
          if (!ref || Object.keys(pos).length === 0) return;
          const key = placementKey(cc, signRef, decCode);
          map[key] = {
            nationalId: ref,
            country: cc.toLowerCase(),
            positions: normalizePositions(pos)
          };
          const cKey = compositeKey(cc, ref);
          if (!map[cKey]) map[cKey] = map[key];
        });
      });
    });
  });
  return map;
}

// GET /api/signs/composite?country=de&reference=DE-103-10 (reference = nationalId)
// Optional: signReference & declinationCode to resolve exact placement (so all sub-panels are returned)
exports.getComposite = (req, res) => {
  const { country, reference, signReference, declinationCode } = req.query || {};
  if (!country || !reference) {
    return res.status(400).json({ success: false, message: 'country and reference required' });
  }
  runCompositeWrite(() => {
    try {
      const data = loadSignsData(true);
      const map = buildCompositeMapFromSigns(data);
      const refLower = (reference || '').trim().toLowerCase();
      const ccLower = (country || '').toLowerCase();
      let item = null;
      if (signReference != null && signReference !== '' && declinationCode !== undefined) {
        const decStr = String(declinationCode);
        const pKey = placementKey(ccLower, String(signReference).trim(), decStr);
        item = map[pKey];
        if (item && (item.nationalId || '').toLowerCase() !== refLower) item = null;
        if (!item && (decStr === '' || decStr === 'undefined')) {
          const signRefLower = String(signReference).trim().toLowerCase();
          const prefix = ccLower + '|' + signRefLower + '|';
          let best = null;
          let bestCount = 0;
          for (const key of Object.keys(map)) {
            if (key.toLowerCase().indexOf(prefix) !== 0) continue;
            const v = map[key];
            if (!v || (v.nationalId || '').toLowerCase() !== refLower) continue;
            const n = Object.keys(v.positions || {}).length;
            if (n > bestCount) { bestCount = n; best = v; }
          }
          if (best) item = best;
        }
      }
      if (!item) item = map[compositeKey(country, reference)];
      if (!item) {
        let best = null;
        let bestCount = 0;
        for (const key of Object.keys(map)) {
          const parts = key.split('|');
          const v = map[key];
          if (parts[0].toLowerCase() !== ccLower || !v || (v.nationalId || '').toLowerCase() !== refLower) continue;
          const n = Object.keys(v.positions || {}).length;
          if (n > bestCount) { bestCount = n; best = v; }
        }
        if (best) item = best;
      }
      if (!item) {
        res.status(404).json({ success: false, message: 'Not found' });
        return;
      }
      res.status(200).json({ success: true, data: item });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }).catch(() => {});
};

// GET /api/signs/composite/all - all composites from road_signs_all.json (template format)
exports.getAllComposites = (req, res) => {
  runCompositeWrite(() => {
    try {
      const data = loadSignsData(true);
      const map = buildCompositeMapFromSigns(data);
      res.status(200).json({ success: true, data: map });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }).catch(() => {});
};

// PUT /api/signs/composite - update localization position in road_signs_all.json (template format)
exports.putComposite = (req, res) => {
  const { country, nationalId, positions, signReference, declinationCode } = req.body || {};
  if (!country || !nationalId) {
    return res.status(400).json({ success: false, message: 'country and nationalId required' });
  }
  if (signReference == null || declinationCode === undefined) {
    return res.status(400).json({ success: false, message: 'signReference and declinationCode required' });
  }
  const normalized = normalizePositions(positions || {});
  const cc = String(country).toLowerCase().trim();

  runCompositeWrite(() => {
    try {
      const data = loadSignsData(true);
      const found = findSignDeclination(data, signReference, declinationCode);
      if (!found) {
        res.status(404).json({ success: false, message: 'Sign or declination not found' });
        return;
      }
      if (!found.dec.localizations) found.dec.localizations = {};
      found.dec.localizations[cc] = { position: normalized };
      saveSignsData(data);
      res.status(200).json({
        success: true,
        data: { nationalId: String(nationalId).trim(), country: cc, positions: normalized }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }).catch(() => {});
};

// DELETE /api/signs/composite?country=de&reference=DE-103-10 - set localization to single panel { center: reference }
exports.deleteComposite = (req, res) => {
  const { country, reference } = req.query || {};
  if (!country || !reference) {
    return res.status(400).json({ success: false, message: 'country and reference required' });
  }
  const cc = (country || '').toLowerCase().trim();
  const ref = (reference || '').trim();

  runCompositeWrite(() => {
    try {
      const data = loadSignsData(true);
      const map = buildCompositeMapFromSigns(data);
      let placementKeyFound = null;
      for (const key of Object.keys(map)) {
        const v = map[key];
        if (v && v.country === cc && (v.nationalId || '').toLowerCase() === ref.toLowerCase()) {
          placementKeyFound = key;
          break;
        }
      }
      if (!placementKeyFound) {
        res.status(404).json({ success: false, message: 'Not found' });
        return;
      }
      const parts = placementKeyFound.split('|');
      const signRef = parts[1] || '';
      const decCode = parts[2] !== undefined ? parts[2] : '';
      const found = findSignDeclination(data, signRef, decCode);
      if (!found || !found.dec.localizations || !found.dec.localizations[cc]) {
        res.status(404).json({ success: false, message: 'Not found' });
        return;
      }
      found.dec.localizations[cc] = { position: { center: ref } };
      saveSignsData(data);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }).catch(() => {});
};

// Legacy: for tests that use COMPOSITE_PATH. No-op when using main JSON.
function loadComposite() {
  return buildCompositeMapFromSigns(loadSignsData(true));
}
exports.loadComposite = loadComposite;

// GET /api/signs/country-images?country=de
exports.getCountryImages = (req, res) => {
  try {
    const { country } = req.query;
    if (!country) {
      return res.status(400).json({ success: false, message: 'country required' });
    }
    const folder = COUNTRY_TO_FOLDER[country.toLowerCase()];
    if (!folder) {
      return res.status(400).json({ success: false, message: 'Unknown country' });
    }
    const dir = path.join(COUNTRIES_DIR, folder);
    if (!fs.existsSync(dir)) {
      return res.status(200).json({ success: true, data: [] });
    }
    const files = fs.readdirSync(dir);
    const refs = new Set();
    files.forEach((f) => {
      const base = f.replace(/\.(svg|png|jpg)$/i, '');
      if (base) refs.add(base);
    });
    res.status(200).json({ success: true, data: Array.from(refs).sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/signs/upload-image
exports.uploadImage = (req, res) => {
  try {
    const country = (req.body && req.body.country) ? req.body.country.trim().toLowerCase() : '';
    const reference = (req.body && req.body.reference) ? req.body.reference.trim() : '';
    const file = req.file;
    if (!country || !reference) {
      return res.status(400).json({ success: false, message: 'country and reference required' });
    }
    const folder = COUNTRY_TO_FOLDER[country];
    if (!folder) {
      return res.status(400).json({ success: false, message: 'Unknown country' });
    }
    if (!file || !file.buffer) {
      return res.status(400).json({ success: false, message: 'Image file required' });
    }
    const ext = (file.mimetype === 'image/svg+xml' || (file.originalname && /\.svg$/i.test(file.originalname))) ? 'svg'
      : (file.mimetype === 'image/png' || (file.originalname && /\.png$/i.test(file.originalname))) ? 'png'
        : 'jpg';
    const safeRef = reference.replace(/[^a-zA-Z0-9\-_]/g, '-');
    if (!safeRef) {
      return res.status(400).json({ success: false, message: 'Invalid reference' });
    }
    const dir = path.join(COUNTRIES_DIR, folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, safeRef + '.' + ext);
    fs.writeFileSync(filePath, file.buffer);
    res.status(200).json({ success: true, data: { reference: safeRef } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
