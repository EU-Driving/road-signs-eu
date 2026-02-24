(function () {
  'use strict';
  const RoadSigns = window.RoadSigns;
  if (!RoadSigns) return;
  const COUNTRY_TO_FOLDER = RoadSigns.COUNTRY_TO_FOLDER;
  const COUNTRY_LABELS = RoadSigns.COUNTRY_LABELS;

  function collectCountriesFromSigns(signs) {
    const set = new Set();
    signs.forEach(function (sign) {
      const declinations = sign.declinations || [];
      declinations.forEach(function (dec) {
        const loc = dec.localizations || {};
        Object.keys(loc).forEach(function (cc) {
          if (COUNTRY_TO_FOLDER[cc]) set.add(cc);
        });
      });
    });
    return Array.from(set).sort();
  }

  /** Countries to show as table columns: all EU from config, or fallback to collected from signs */
  function getCountriesForTable() {
    if (typeof RoadSigns.getTableCountries === 'function') return RoadSigns.getTableCountries();
    return collectCountriesFromSigns(RoadSigns.categoryData && RoadSigns.categoryData.signs ? RoadSigns.categoryData.signs : []);
  }

  function getLocalizationsForSign(sign, mergeVersions, onlyDeclination) {
    const declinations = sign.declinations || [];
    const toProcess = onlyDeclination ? [onlyDeclination] : declinations;
    const byCountry = {};
    toProcess.forEach(function (dec) {
      const loc = dec.localizations || {};
      Object.keys(loc).forEach(function (cc) {
        if (!COUNTRY_TO_FOLDER[cc]) return;
        if (!byCountry[cc]) byCountry[cc] = [];
        const ref = RoadSigns.getReferenceFromLoc ? RoadSigns.getReferenceFromLoc(loc[cc]) : (loc[cc] && loc[cc].reference);
        if (ref) byCountry[cc].push({ country: cc, reference: ref });
      });
    });
    return byCountry;
  }

  function getRowKey(row) {
    if (!row || row.merge) return '';
    const dec = row.declination;
    const idx = row.declinationIndex;
    if (!dec) return '';
    if (dec.code != null && String(dec.code).trim() !== '') return String(dec.code);
    return '_idx_' + (idx !== undefined ? idx : 0);
  }

  /** Find composite for a cell: try placement key, then composite key, then (if merge mode) any key country|signRef|* */
  function getCompositeForCell(cc, signRef, rowKey, nationalRef, mergeVersions) {
    const placementKey = RoadSigns.getPlacementKey(cc, signRef, rowKey);
    let composite = RoadSigns.compositesData[placementKey];
    if (composite) return composite;
    if (nationalRef) composite = RoadSigns.compositesData[RoadSigns.getCompositeKey(cc, nationalRef)];
    if (composite) return composite;
    if (!mergeVersions) return null;
    const prefix = (cc + '|' + signRef + '|').toLowerCase();
    for (const key in RoadSigns.compositesData) {
      if (key.toLowerCase().indexOf(prefix) === 0) return RoadSigns.compositesData[key];
    }
    return null;
  }

  function buildRows(mergeVersions) {
    const categoryData = RoadSigns.categoryData;
    if (!categoryData || !categoryData.signs) return [];
    const signs = categoryData.signs;
    const rows = [];
    if (mergeVersions) {
      signs.forEach(function (sign) {
        rows.push({
          label: sign.reference + ' – ' + (sign.name || ''),
          reference: sign.reference,
          sign: sign,
          merge: true
        });
      });
    } else {
      signs.forEach(function (sign) {
        const declinations = sign.declinations || [];
        declinations.forEach(function (dec, idx) {
          const loc = dec.localizations || {};
          if (Object.keys(loc).length === 0) return;
          const decLabel = RoadSigns.getDeclinationDisplayRef(dec) || ('Declination ' + (idx + 1));
          rows.push({
            label: sign.reference + ' – ' + decLabel + ' – ' + (sign.name || ''),
            reference: sign.reference,
            sign: sign,
            declination: dec,
            declinationIndex: idx,
            merge: false
          });
        });
      });
    }
    return rows;
  }

  function renderCell(refs, onePerCell, signReference, countryCode) {
    const container = document.createElement('div');
    container.className = 'cell-images' + (onePerCell ? ' one-per-cell' : '');
    if (!refs || refs.length === 0) {
      container.textContent = '–';
      return container;
    }
    const imgBase = RoadSigns.getImagesBase ? RoadSigns.getImagesBase() : '';
    refs.forEach(function (r) {
      const img = document.createElement('img');
      img.alt = r.reference;
      img.loading = 'lazy';
      img.style.height = '48px';
      img.style.maxHeight = '48px';
      img.style.objectFit = 'contain';
      if (signReference && countryCode) {
        img.dataset.signRef = signReference;
        img.addEventListener('click', function () { RoadSigns.openSignDetail(signReference, countryCode); });
      }
      const folder = COUNTRY_TO_FOLDER[r.country];
      if (imgBase && folder) {
        const baseUrl = imgBase + folder + '/' + r.reference;
        RoadSigns.tryImageFormats(baseUrl, img, function () {
          if (window.console && console.error) console.error('No image found for ' + r.reference + ' (' + r.country + ')');
        });
      }
      container.appendChild(img);
    });
    return container;
  }

  function renderEmptyCell(signRef, countryCode, rowKey) {
    const wrap = document.createElement('div');
    wrap.className = 'cell-empty';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cell-add-btn';
    btn.setAttribute('aria-label', 'Add');
    btn.textContent = '+';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof RoadSigns.openSignEdit === 'function') {
        RoadSigns.openSignEdit(signRef, countryCode, '', { rowKey: rowKey || '' });
      }
    });
    wrap.appendChild(btn);
    return wrap;
  }

  function renderCompositeCell(composite, countryCode, signRef, rowKey) {
    const folder = COUNTRY_TO_FOLDER[countryCode];
    const imgBase = RoadSigns.getImagesBase ? RoadSigns.getImagesBase() : '';
    if (!folder || !imgBase) return document.createElement('div');
    const positions = composite.positions || {};
    const wrap = document.createElement('div');
    wrap.className = 'cell-images cell-images--composite';
    const grid = document.createElement('div');
    grid.className = 'composite-display-grid';
    const currentRowKey = rowKey !== undefined ? rowKey : '';
    function addSlot(key) {
      const ref = positions[key];
      if (!ref) return null;
      const slot = document.createElement('div');
      slot.className = 'composite-display-slot composite-display-slot--' + key;
      const img = document.createElement('img');
      img.alt = ref;
      RoadSigns.tryImageFormats(imgBase + folder + '/' + ref, img, null);
      if (signRef) {
        const compositeId = composite.nationalId || positions.center || ref;
        img.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof RoadSigns.openCompositeDetail === 'function') {
            RoadSigns.openCompositeDetail(signRef, countryCode, compositeId, currentRowKey);
          } else if (typeof RoadSigns.openSignEdit === 'function') {
            RoadSigns.openSignEdit(signRef, countryCode, compositeId, { rowKey: currentRowKey });
          } else {
            RoadSigns.openSignDetail(signRef, countryCode);
          }
        });
      }
      slot.appendChild(img);
      return slot;
    }
    const topCell = document.createElement('div');
    topCell.className = 'composite-display-cell composite-display-cell--top';
    ['top1', 'top2', 'top3'].forEach(function (k) { if (positions[k]) topCell.appendChild(addSlot(k)); });
    const leftCell = document.createElement('div');
    leftCell.className = 'composite-display-cell composite-display-cell--left';
    ['left1', 'left2', 'left3'].forEach(function (k) { if (positions[k]) leftCell.appendChild(addSlot(k)); });
    const centerCell = document.createElement('div');
    centerCell.className = 'composite-display-cell composite-display-cell--center';
    if (positions.center) centerCell.appendChild(addSlot('center'));
    const rightCell = document.createElement('div');
    rightCell.className = 'composite-display-cell composite-display-cell--right';
    ['right1', 'right2', 'right3'].forEach(function (k) { if (positions[k]) rightCell.appendChild(addSlot(k)); });
    const bottomCell = document.createElement('div');
    bottomCell.className = 'composite-display-cell composite-display-cell--bottom';
    ['bottom1', 'bottom2', 'bottom3'].forEach(function (k) { if (positions[k]) bottomCell.appendChild(addSlot(k)); });
    grid.appendChild(topCell);
    grid.appendChild(leftCell);
    grid.appendChild(centerCell);
    grid.appendChild(rightCell);
    grid.appendChild(bottomCell);
    wrap.appendChild(grid);
    return wrap;
  }

  function renderTable() {
    const mergeCheckbox = document.getElementById('mergeVersions');
    const onePerCellCheckbox = document.getElementById('onePerCell');
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    const mergeVersions = mergeCheckbox && mergeCheckbox.checked;
    const onePerCell = onePerCellCheckbox && onePerCellCheckbox.checked;
    const rows = buildRows(mergeVersions);
    const countries = getCountriesForTable();

    const theadTr = document.createElement('tr');
    theadTr.appendChild(document.createElement('th')).className = 'row-label';
    theadTr.querySelector('.row-label').textContent = 'Sign';
    countries.forEach(function (cc) {
      const th = document.createElement('th');
      th.className = 'country-col';
      const wrap = document.createElement('div');
      wrap.className = 'country-header';
      const flagImg = document.createElement('img');
      flagImg.className = 'country-flag';
      flagImg.src = RoadSigns.flagUrl(cc);
      flagImg.alt = '';
      const code = document.createElement('span');
      code.className = 'country-code';
      code.textContent = COUNTRY_LABELS[cc] || cc.toUpperCase();
      wrap.appendChild(flagImg);
      wrap.appendChild(code);
      th.appendChild(wrap);
      theadTr.appendChild(th);
    });
    tableHead.innerHTML = '';
    tableHead.appendChild(theadTr);

    tableBody.innerHTML = '';
    rows.forEach(function (row) {
      const tr = document.createElement('tr');
      tr.dataset.signRef = row.sign.reference;
      tr.dataset.rowKey = getRowKey(row);
      const tdLabel = document.createElement('td');
      tdLabel.className = 'row-label';
      const labelWrap = document.createElement('span');
      labelWrap.className = 'row-label-text';
      labelWrap.textContent = row.label;
      tdLabel.appendChild(labelWrap);
      if (!row.merge && row.declination && typeof RoadSigns.editDeclinationName === 'function') {
        const btnEdit = document.createElement('button');
        btnEdit.type = 'button';
        btnEdit.className = 'row-label-edit';
        btnEdit.title = 'Edit declination name';
        btnEdit.textContent = '\u270E';
        btnEdit.setAttribute('aria-label', 'Edit declination name');
        btnEdit.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          RoadSigns.editDeclinationName(row.sign.reference, getRowKey(row), RoadSigns.getDeclinationDisplayRef(row.declination), function (newLabel) {
            labelWrap.textContent = row.sign.reference + ' – ' + newLabel + ' – ' + (row.sign.name || '');
          });
        });
        tdLabel.appendChild(btnEdit);
      }
      tr.appendChild(tdLabel);

      const byCountry = getLocalizationsForSign(row.sign, mergeVersions, mergeVersions ? null : row.declination);

      countries.forEach(function (cc) {
        const td = document.createElement('td');
        td.dataset.country = cc;
        const refs = byCountry[cc];
        const signRef = row.sign.reference;
        const nationalRef = refs && refs[0] ? refs[0].reference : null;
        td.dataset.nationalRef = nationalRef || '';
        const rowKey = getRowKey(row);
        const composite = getCompositeForCell(cc, signRef, rowKey, nationalRef, mergeVersions);
        if (composite && composite.positions && Object.keys(composite.positions).length > 0) {
          td.appendChild(renderCompositeCell(composite, cc, signRef, rowKey));
        } else if (onePerCell && refs && refs.length > 0) {
          td.appendChild(renderCell([refs[0]], true, signRef, cc));
        } else if (!refs || refs.length === 0) {
          td.appendChild(renderEmptyCell(signRef, cc, rowKey));
        } else {
          td.appendChild(renderCell(refs, false, signRef, cc));
        }
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });
    if (typeof RoadSigns.updateTableScrollHint === 'function') RoadSigns.updateTableScrollHint();
  }

  function updateTableCell(signReference, countryCode, nationalIdToShow, previousNationalId, optionalRowKey) {
    const categoryData = RoadSigns.categoryData;
    if (!categoryData) return;
    const mergeCheckbox = document.getElementById('mergeVersions');
    const onePerCellCheckbox = document.getElementById('onePerCell');
    const tableBody = document.getElementById('tableBody');
    const mergeVersions = mergeCheckbox && mergeCheckbox.checked;
    const onePerCell = onePerCellCheckbox && onePerCellCheckbox.checked;
    const rows = buildRows(mergeVersions);
    const findCellByNationalId = (previousNationalId !== undefined && previousNationalId !== '') ? previousNationalId : nationalIdToShow;
    let row = null;
    if (optionalRowKey !== undefined && optionalRowKey !== null && !mergeVersions) {
      const sk = String(optionalRowKey);
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].sign.reference !== signReference) continue;
        if (getRowKey(rows[i]) === sk) {
          row = rows[i];
          break;
        }
      }
    }
    if (!row) {
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].sign.reference !== signReference) continue;
        if (mergeVersions) {
          row = rows[i];
          break;
        }
        const byCountry = getLocalizationsForSign(rows[i].sign, mergeVersions, rows[i].declination);
        const refs = byCountry[countryCode];
        const nr = refs && refs[0] ? refs[0].reference : null;
        if (nr === findCellByNationalId) {
          row = rows[i];
          break;
        }
      }
    }
    if (!row) return;
    const targetRowKey = getRowKey(row);
    for (let i = 0; i < tableBody.rows.length; i++) {
      const r = tableBody.rows[i];
      if (r.dataset.signRef !== signReference) continue;
      if (!mergeVersions && r.dataset.rowKey !== targetRowKey) continue;
      for (let j = 0; j < r.cells.length; j++) {
        const td = r.cells[j];
        if (td.dataset.country !== countryCode) continue;
        if (optionalRowKey == null && td.dataset.nationalRef !== findCellByNationalId) continue;
        const placementKeyForRow = RoadSigns.getPlacementKey(countryCode, row.sign.reference, targetRowKey);
        const composite = RoadSigns.compositesData[placementKeyForRow] || RoadSigns.compositesData[RoadSigns.getCompositeKey(countryCode, nationalIdToShow)];
        const byCountry = getLocalizationsForSign(row.sign, mergeVersions, mergeVersions ? null : row.declination);
        const refs = byCountry[countryCode];
        td.innerHTML = '';
        if (composite && composite.positions && Object.keys(composite.positions).length > 0) {
          td.appendChild(renderCompositeCell(composite, countryCode, row.sign.reference, targetRowKey));
        } else if (onePerCell && refs && refs.length > 0) {
          td.appendChild(renderCell([refs[0]], true, row.sign.reference, countryCode));
        } else if (!refs || refs.length === 0) {
          td.appendChild(renderEmptyCell(row.sign.reference, countryCode, targetRowKey));
        } else {
          td.appendChild(renderCell(refs, false, row.sign.reference, countryCode));
        }
        td.dataset.nationalRef = nationalIdToShow;
        return;
      }
    }
  }

  function updateEmptyCellAfterAdd(signReference, countryCode, newNationalId, rowKey) {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    const targetRowKey = (rowKey !== undefined && rowKey !== null) ? String(rowKey) : '';
    for (let i = 0; i < tableBody.rows.length; i++) {
      const r = tableBody.rows[i];
      if (r.dataset.signRef !== signReference) continue;
      if (r.dataset.rowKey !== targetRowKey) continue;
      for (let j = 0; j < r.cells.length; j++) {
        const td = r.cells[j];
        if (td.dataset.country === countryCode && td.dataset.nationalRef === '') {
          const composite = RoadSigns.compositesData[RoadSigns.getPlacementKey(countryCode, signReference, targetRowKey)] || RoadSigns.compositesData[RoadSigns.getCompositeKey(countryCode, newNationalId)];
          td.innerHTML = '';
          if (composite && composite.positions && Object.keys(composite.positions).length > 0) {
            td.appendChild(renderCompositeCell(composite, countryCode, signReference, targetRowKey));
          } else {
            td.appendChild(renderEmptyCell(signReference, countryCode, targetRowKey));
          }
          td.dataset.nationalRef = newNationalId;
          return;
        }
      }
    }
  }

  function updateTableCellClearComposite(signReference, countryCode, nationalIdToClear) {
    const categoryData = RoadSigns.categoryData;
    if (!categoryData) return;
    const mergeCheckbox = document.getElementById('mergeVersions');
    const onePerCellCheckbox = document.getElementById('onePerCell');
    const tableBody = document.getElementById('tableBody');
    const mergeVersions = mergeCheckbox && mergeCheckbox.checked;
    const onePerCell = onePerCellCheckbox && onePerCellCheckbox.checked;
    const rows = buildRows(mergeVersions);
    let row = null;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].sign.reference !== signReference) continue;
      const byCountry = getLocalizationsForSign(rows[i].sign, mergeVersions, rows[i].declination);
      const refs = byCountry[countryCode];
      const nr = refs && refs[0] ? refs[0].reference : null;
      if (nr === nationalIdToClear) {
        row = rows[i];
        break;
      }
    }
    if (!row) return;
    for (let i = 0; i < tableBody.rows.length; i++) {
      const r = tableBody.rows[i];
      if (r.dataset.signRef !== signReference) continue;
      for (let j = 0; j < r.cells.length; j++) {
        const td = r.cells[j];
        if (td.dataset.country !== countryCode) continue;
        if (td.dataset.nationalRef !== nationalIdToClear) continue;
        td.innerHTML = '';
        td.appendChild(renderEmptyCell(signReference, countryCode, getRowKey(row)));
        td.dataset.nationalRef = '';
        return;
      }
    }
  }

  RoadSigns.collectCountriesFromSigns = collectCountriesFromSigns;
  RoadSigns.getLocalizationsForSign = getLocalizationsForSign;
  RoadSigns.buildRows = buildRows;
  RoadSigns.renderCell = renderCell;
  RoadSigns.renderEmptyCell = renderEmptyCell;
  RoadSigns.renderCompositeCell = renderCompositeCell;
  RoadSigns.renderTable = renderTable;
  RoadSigns.updateTableCell = updateTableCell;
  RoadSigns.updateEmptyCellAfterAdd = updateEmptyCellAfterAdd;
  RoadSigns.updateTableCellClearComposite = updateTableCellClearComposite;
})();

(function () {
  'use strict';
  function updateTableScrollHint() {
    var wrap = document.getElementById('tableWrap');
    var hint = document.getElementById('scrollHint');
    if (!wrap || !hint) return;
    function update() {
      var canScroll = wrap.scrollWidth > wrap.clientWidth;
      var atEnd = wrap.scrollLeft >= wrap.scrollWidth - wrap.clientWidth - 2;
      hint.classList.toggle('visible', canScroll && !atEnd);
    }
    update();
    wrap.removeEventListener('scroll', update);
    wrap.addEventListener('scroll', update);
    window.removeEventListener('resize', update);
    window.addEventListener('resize', update);
  }
  window.RoadSigns = window.RoadSigns || {};
  window.RoadSigns.updateTableScrollHint = updateTableScrollHint;
})();
