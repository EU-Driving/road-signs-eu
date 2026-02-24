const {
  loadSignsData,
  saveSignsData,
  normalizeLocalization,
  getReferenceFromLoc,
  findSignDeclination
} = require('../data/signs');

// GET - Category by id. ?light=true = minimal payload. Localizations always in template format { position: {...} }.
exports.getByCategory = (req, res) => {
  try {
    const { category, light } = req.query;
    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Query "category" required (e.g. ?category=VIENNA-A)'
      });
    }
    const data = loadSignsData();
    const found = data.categories.find(
      (cat) => cat.category.toLowerCase() === category.trim().toLowerCase()
    );
    if (!found) {
      return res.status(404).json({
        success: false,
        message: `Category "${category}" not found`
      });
    }
    let payload = found;
    if (light === 'true' || light === '1') {
      payload = {
        category: found.category,
        categoryName: found.categoryName,
        count: found.count,
        signs: (found.signs || []).map((sign) => ({
          reference: sign.reference,
          name: sign.name,
          declinations: (sign.declinations || []).map((dec) => ({
            code: dec.code,
            localizations: normalizeDeclinationLocalizations(dec.localizations)
          }))
        }))
      };
    } else {
      payload = JSON.parse(JSON.stringify(found));
      if (payload.signs) {
        payload.signs.forEach((sign) => {
          if (sign.declinations) {
            sign.declinations.forEach((dec) => {
              if (dec.localizations) {
                dec.localizations = normalizeDeclinationLocalizations(dec.localizations);
              }
            });
          }
        });
      }
    }
    res.status(200).json({
      success: true,
      data: payload
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message
    });
  }
};

function normalizeDeclinationLocalizations(localizations) {
  const out = {};
  Object.keys(localizations || {}).forEach((cc) => {
    out[cc] = normalizeLocalization(localizations[cc]);
  });
  return out;
}

// GET - Sign by reference. Response in template format. compositeCountries = countries with at least one localization.
exports.getByReference = (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference || !reference.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Query "reference" required (e.g. ?reference=VIENNA-A1a)'
      });
    }
    const ref = reference.trim();
    const data = loadSignsData();
    for (const cat of data.categories) {
      const sign = cat.signs.find(
        (s) => s.reference && s.reference.toLowerCase() === ref.toLowerCase()
      );
      if (sign) {
        const compositeCountries = [];
        (sign.declinations || []).forEach((dec) => {
          Object.keys(dec.localizations || {}).forEach((cc) => {
            if (compositeCountries.indexOf(cc.toLowerCase()) === -1) compositeCountries.push(cc.toLowerCase());
          });
        });
        compositeCountries.sort();
        const signOut = JSON.parse(JSON.stringify(sign));
        if (signOut.declinations) {
          signOut.declinations.forEach((dec) => {
            if (dec.localizations) dec.localizations = normalizeDeclinationLocalizations(dec.localizations);
          });
        }
        return res.status(200).json({
          success: true,
          data: {
            category: cat.category,
            categoryName: cat.categoryName,
            sign: signOut,
            compositeCountries
          }
        });
      }
    }
    res.status(404).json({
      success: false,
      message: `Reference "${ref}" not found`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching sign',
      error: error.message
    });
  }
};

// GET - List categories
exports.getCategories = (req, res) => {
  try {
    const data = loadSignsData();
    const list = data.categories.map((cat) => ({
      category: cat.category,
      categoryName: cat.categoryName,
      count: cat.count
    }));
    res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// PATCH - Update declination display name. Body: { signReference, declinationCode, name } (name = '' to clear).
exports.patchDeclinationName = (req, res) => {
  try {
    const { signReference, declinationCode, name } = req.body || {};
    if (!signReference || signReference.trim() === '') {
      return res.status(400).json({ success: false, message: 'signReference required' });
    }
    if (declinationCode === undefined || declinationCode === null) {
      return res.status(400).json({ success: false, message: 'declinationCode required' });
    }
    const data = loadSignsData(true);
    const found = findSignDeclination(data, signReference.trim(), String(declinationCode));
    if (!found) {
      return res.status(404).json({ success: false, message: 'Sign or declination not found' });
    }
    const newName = typeof name === 'string' ? name.trim() : '';
    if (newName) {
      found.dec.name = newName;
    } else {
      delete found.dec.name;
    }
    saveSignsData(data);
    return res.status(200).json({
      success: true,
      data: { signReference: found.sign.reference, declinationCode: found.dec.code != null ? String(found.dec.code) : ('_idx_' + found.decIdx), name: found.dec.name || '' }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.loadSignsData = loadSignsData;
exports.saveSignsData = saveSignsData;
exports.normalizeLocalization = normalizeLocalization;
exports.getReferenceFromLoc = getReferenceFromLoc;
exports.normalizeDeclinationLocalizations = normalizeDeclinationLocalizations;
