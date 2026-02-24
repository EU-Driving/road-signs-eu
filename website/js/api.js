(function () {
  'use strict';
  const RoadSigns = window.RoadSigns;
  if (!RoadSigns) return;
  const COUNTRY_TO_FOLDER = RoadSigns.COUNTRY_TO_FOLDER;

  function getApiBase() {
    const apiBaseInput = document.getElementById('apiBase');
    const val = (apiBaseInput && apiBaseInput.value || '').trim().replace(/\/$/, '');
    return val || (typeof window !== 'undefined' && window.location ? window.location.origin : '');
  }

  function flagUrl(cc) {
    const code = (cc || '').toLowerCase();
    if (RoadSigns.COUNTRY_FLAGS && RoadSigns.COUNTRY_FLAGS[code]) return RoadSigns.COUNTRY_FLAGS[code];
    const base = getApiBase();
    return base ? base + '/flags/' + code + '.png' : '';
  }

  function setStatus(msg, type) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.className = 'status' + (type ? ' ' + type : '');
    }
  }

  function loadCategories() {
    const base = getApiBase();
    const categorySelect = document.getElementById('categorySelect');
    if (!base) {
      setStatus('Enter API URL (e.g. http://localhost:3000).', 'error');
      return;
    }
    setStatus('Loading categories…', 'loading');
    fetch(base + '/api/signs/categories')
      .then(function (res) {
        if (!res.ok) throw new Error('API: ' + res.status);
        return res.json();
      })
      .then(function (json) {
        if (!json.success || !json.data) throw new Error('Invalid API response');
        RoadSigns.categoriesList = json.data;
        if (categorySelect) {
          categorySelect.innerHTML = '';
          json.data.forEach(function (cat) {
            const opt = document.createElement('option');
            opt.value = cat.category;
            opt.textContent = cat.category + ' – ' + (cat.categoryName || '') + ' (' + (cat.count || 0) + ')';
            categorySelect.appendChild(opt);
          });
        }
        setStatus('');
        const first = json.data[0];
        if (first && categorySelect) {
          categorySelect.value = first.category;
          RoadSigns.loadCategory(first.category);
        }
      })
      .catch(function (err) {
        setStatus('Error: ' + (err.message || err), 'error');
        if (categorySelect) categorySelect.innerHTML = '<option value="">Error</option>';
      });
  }

  function loadCategory(categoryId) {
    const base = getApiBase();
    const categorySubtitle = document.getElementById('categorySubtitle');
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    if (!base || !categoryId) return;
    setStatus('Loading…', 'loading');
    fetch(base + '/api/signs?category=' + encodeURIComponent(categoryId) + '&light=true')
      .then(function (res) {
        if (!res.ok) throw new Error('API: ' + res.status);
        return res.json();
      })
      .then(function (json) {
        if (!json.success || !json.data) throw new Error('Invalid API response');
        RoadSigns.categoryData = json.data;
        if (categorySubtitle) {
          categorySubtitle.textContent = (json.data.categoryName || json.data.category) + ' – Vienna Convention';
        }
        setStatus('');
        buildCompositesFromCategoryData(json.data);
        if (RoadSigns.renderTable) RoadSigns.renderTable();
      })
      .catch(function (err) {
        setStatus('Error: ' + (err.message || err), 'error');
        RoadSigns.categoryData = null;
        if (tableHead) tableHead.innerHTML = '';
        if (tableBody) tableBody.innerHTML = '';
      });
  }

  /** Build compositesData from category response (template format: localizations[country].position). */
  function buildCompositesFromCategoryData(categoryData) {
    RoadSigns.compositesData = {};
    if (!categoryData || !categoryData.signs) return;
    const getRef = RoadSigns.getReferenceFromLoc || function (loc) { return loc && loc.reference; };
    const getPlacementKey = RoadSigns.getPlacementKey;
    categoryData.signs.forEach(function (sign) {
      (sign.declinations || []).forEach(function (dec, decIdx) {
        const rowKey = (dec.code != null && String(dec.code).trim() !== '') ? String(dec.code) : ('_idx_' + decIdx);
        const locs = dec.localizations || {};
        Object.keys(locs).forEach(function (cc) {
          const loc = locs[cc];
          const pos = loc && loc.position && typeof loc.position === 'object' ? loc.position : {};
          const ref = getRef(loc);
          if (!ref || Object.keys(pos).length === 0) return;
          const key = getPlacementKey(cc, sign.reference, rowKey);
          RoadSigns.compositesData[key] = { nationalId: ref, country: cc, positions: pos };
        });
      });
    });
  }

  function loadCompositesAndRefresh() {
    const base = getApiBase();
    fetch(base + '/api/signs/composite/all')
      .then(function (res) {
        if (res.status === 404) return { success: false };
        return res.json();
      })
      .then(function (json) {
        RoadSigns.compositesData = json && json.success && json.data ? json.data : {};
        if (RoadSigns.categoryData && RoadSigns.renderTable) RoadSigns.renderTable();
      })
      .catch(function () {
        RoadSigns.compositesData = {};
        if (RoadSigns.categoryData && RoadSigns.renderTable) RoadSigns.renderTable();
      });
  }

  function loadCountryImages(countryCode, cb) {
    const base = getApiBase();
    fetch(base + '/api/signs/country-images?country=' + encodeURIComponent(countryCode))
      .then(function (res) {
        if (res.status === 404) return { success: false, data: [] };
        return res.json();
      })
      .then(function (json) {
        cb(json && json.success && json.data ? json.data : []);
      })
      .catch(function () { cb([]); });
  }

  function editDeclinationName(signReference, declinationCode, currentName, onSuccess) {
    const base = getApiBase();
    if (!base) { setStatus('API URL required', 'error'); return; }
    const name = window.prompt('Declination name', currentName || '');
    if (name === null) return;
    fetch(base + '/api/signs/declination-name', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signReference: signReference,
        declinationCode: declinationCode,
        name: name.trim()
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (json && json.success) {
          if (typeof onSuccess === 'function') onSuccess(json.data && json.data.name !== undefined ? json.data.name : name.trim());
          if (RoadSigns.categoryData && RoadSigns.loadCategory) {
            const catId = RoadSigns.categoryData.category;
            RoadSigns.loadCategory(catId);
          }
        } else {
          setStatus(json && json.message ? json.message : 'Failed to save', 'error');
        }
      })
      .catch(function () { setStatus('Network error', 'error'); });
  }

  RoadSigns.getApiBase = getApiBase;
  RoadSigns.flagUrl = flagUrl;
  RoadSigns.setStatus = setStatus;
  RoadSigns.loadCategories = loadCategories;
  RoadSigns.loadCategory = loadCategory;
  RoadSigns.loadCompositesAndRefresh = loadCompositesAndRefresh;
  RoadSigns.loadCountryImages = loadCountryImages;
  RoadSigns.editDeclinationName = editDeclinationName;
})();
