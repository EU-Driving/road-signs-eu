(function () {
  'use strict';
  const RoadSigns = window.RoadSigns;
  if (!RoadSigns) return;
  const COUNTRY_TO_FOLDER = RoadSigns.COUNTRY_TO_FOLDER;

  function tryImageFormats(baseUrlWithoutExt, imgElement, onAllFailed) {
    const exts = ['svg', 'png', 'jpg'];
    let idx = 0;
    function tryNext() {
      if (idx >= exts.length) {
        if (typeof onAllFailed === 'function') onAllFailed();
        return;
      }
      const url = baseUrlWithoutExt + '.' + exts[idx++];
      fetch(url).then(function (r) {
        if (r.ok) return r.blob();
        tryNext();
      }).then(function (blob) {
        if (blob) imgElement.src = URL.createObjectURL(blob);
      }).catch(tryNext);
    }
    tryNext();
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getCompositeKey(countryCode, nationalRef) {
    return (countryCode + '|' + (nationalRef || '')).toLowerCase();
  }

  /** Placement key for composite at a given declination: country|signReference|declinationCode */
  function getPlacementKey(countryCode, signReference, declinationCode) {
    const c = (countryCode || '').toLowerCase().trim();
    const s = (signReference || '').trim();
    const d = (declinationCode !== undefined && declinationCode !== null) ? String(declinationCode).trim() : '';
    return c + '|' + s + '|' + d;
  }

  function getFirstSignImage(sign) {
    const declinations = sign.declinations || [];
    for (let i = 0; i < declinations.length; i++) {
      const loc = declinations[i].localizations || {};
      const keys = Object.keys(loc);
      for (let j = 0; j < keys.length; j++) {
        const cc = keys[j];
        const folder = COUNTRY_TO_FOLDER[cc];
        const ref = getReferenceFromLoc(loc[cc]);
        if (folder && ref) return { folder: folder, ref: ref };
      }
    }
    return null;
  }

  function getSignImageForCountry(sign, countryCode) {
    const folder = COUNTRY_TO_FOLDER[countryCode];
    if (!folder) return null;
    const declinations = sign.declinations || [];
    for (let i = 0; i < declinations.length; i++) {
      const ref = getReferenceFromLoc((declinations[i].localizations || {})[countryCode]);
      if (ref) return { folder: folder, ref: ref };
    }
    return null;
  }

  /** Get reference from localization (template format { position: {...} } or legacy { reference }). */
  function getReferenceFromLoc(loc) {
    if (!loc) return null;
    if (loc.reference) return loc.reference;
    const pos = loc.position;
    if (pos && typeof pos === 'object') {
      if (pos.center) return pos.center;
      const keys = ['left1', 'left2', 'left3', 'right1', 'right2', 'right3', 'top1', 'top2', 'top3', 'bottom1', 'bottom2', 'bottom3'];
      for (const k of keys) { if (pos[k]) return pos[k]; }
    }
    return null;
  }

  function getNationalCodeForCountry(sign, countryCode) {
    const declinations = sign.declinations || [];
    for (let i = 0; i < declinations.length; i++) {
      const ref = getReferenceFromLoc((declinations[i].localizations || {})[countryCode]);
      if (ref) return ref;
    }
    return null;
  }

  /** Display label for a declination: name (if set), else code, or first localization reference, or fallback. */
  function getDeclinationDisplayRef(dec) {
    if (dec.name != null && String(dec.name).trim() !== '') return String(dec.name).trim();
    if (dec.code != null && String(dec.code).trim() !== '') return String(dec.code).trim();
    const loc = dec.localizations || {};
    for (const cc of Object.keys(loc)) {
      const ref = getReferenceFromLoc(loc[cc]);
      if (ref) return ref;
    }
    return '';
  }

  RoadSigns.tryImageFormats = tryImageFormats;
  RoadSigns.escapeHtml = escapeHtml;
  RoadSigns.getCompositeKey = getCompositeKey;
  RoadSigns.getPlacementKey = getPlacementKey;
  RoadSigns.getReferenceFromLoc = getReferenceFromLoc;
  RoadSigns.getFirstSignImage = getFirstSignImage;
  RoadSigns.getSignImageForCountry = getSignImageForCountry;
  RoadSigns.getNationalCodeForCountry = getNationalCodeForCountry;
  RoadSigns.getDeclinationDisplayRef = getDeclinationDisplayRef;
})();
