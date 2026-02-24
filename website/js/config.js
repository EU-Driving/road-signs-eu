(function () {
  'use strict';
  window.RoadSigns = window.RoadSigns || {};

  /** EU 27 country codes (ISO 3166-1 alpha-2) for table columns */
  const EU_COUNTRY_CODES = [
    'at', 'be', 'bg', 'hr', 'cy', 'cz', 'dk', 'ee', 'fi', 'fr', 'de', 'gr', 'hu',
    'ie', 'it', 'lv', 'lt', 'lu', 'mt', 'nl', 'pl', 'pt', 'ro', 'sk', 'si', 'es', 'se'
  ];

  const COUNTRY_TO_FOLDER = {
    at: 'austria', be: 'belgium', bg: 'bulgaria', hr: 'croatia', cy: 'cyprus',
    cz: 'czech-republic', dk: 'denmark', ee: 'estonia', fi: 'finland', fr: 'france',
    de: 'germany', gr: 'greece', hu: 'hungary', ie: 'ireland', it: 'italy',
    lv: 'latvia', lt: 'lithuania', lu: 'luxembourg', mt: 'malta', nl: 'netherlands',
    pl: 'poland', pt: 'portugal', ro: 'romania', sk: 'slovakia', si: 'slovenia',
    es: 'spain', se: 'sweden'
  };
  const COUNTRY_LABELS = {};
  EU_COUNTRY_CODES.forEach(function (cc) {
    COUNTRY_LABELS[cc] = cc.toUpperCase();
  });

  const COUNTRY_FLAGS = {};

  function applyCountries(list) {
    if (!list || !Array.isArray(list)) return;
    const folder = Object.assign({}, window.RoadSigns.COUNTRY_TO_FOLDER);
    const label = Object.assign({}, window.RoadSigns.COUNTRY_LABELS);
    const flags = Object.assign({}, window.RoadSigns.COUNTRY_FLAGS || {});
    list.forEach(function (c) {
      const code = (c.countryCode || c.code || '').toLowerCase();
      if (code) {
        if (c.folder) folder[code] = c.folder;
        if (c.label) label[code] = c.label;
        else if (c.countryName) label[code] = (c.countryCode || code).toUpperCase();
        else label[code] = code.toUpperCase();
        if (c.countryFlag && EU_COUNTRY_CODES.indexOf(code) !== -1) flags[code] = c.countryFlag;
      }
    });
    window.RoadSigns.COUNTRY_TO_FOLDER = folder;
    window.RoadSigns.COUNTRY_LABELS = label;
    window.RoadSigns.COUNTRY_FLAGS = flags;
  }

  /** Returns the list of country codes to use for table columns (all EU). */
  function getTableCountries() {
    return EU_COUNTRY_CODES.slice();
  }

  /** Base URL for sign images (sans API). Chemin relatif vers le dossier countries. */
  function getImagesBase() {
    return '../countries/';
  }

  window.RoadSigns.EU_COUNTRY_CODES = EU_COUNTRY_CODES;
  window.RoadSigns.getImagesBase = getImagesBase;
  window.RoadSigns.COUNTRY_TO_FOLDER = COUNTRY_TO_FOLDER;
  window.RoadSigns.COUNTRY_LABELS = COUNTRY_LABELS;
  window.RoadSigns.COUNTRY_FLAGS = Object.assign({}, COUNTRY_FLAGS);
  window.RoadSigns.getTableCountries = getTableCountries;

  fetch('countries.json')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(applyCountries)
    .catch(function () {});

  window.RoadSigns.POSITION_SIDES = ['left', 'right', 'top', 'bottom'];
  window.RoadSigns.MAX_PER_SIDE = 3;
})();
