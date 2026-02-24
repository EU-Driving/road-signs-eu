(function () {
  'use strict';
  const RoadSigns = window.RoadSigns;
  if (!RoadSigns) return;

  function closeSignModal() {
    const modal = document.getElementById('signModal');
    if (modal) modal.hidden = true;
  }

  function openSignDetail(reference, countryCode) {
    const modal = document.getElementById('signModal');
    const body = document.getElementById('signModalBody');
    const titleEl = document.getElementById('signModalTitle');
    if (!modal || !body) return;
    modal.hidden = false;
    body.innerHTML = '<p class="modal-loading">Loading…</p>';
    titleEl.textContent = reference;
    const base = RoadSigns.getApiBase();
    fetch(base + '/api/signs?reference=' + encodeURIComponent(reference))
      .then(function (res) {
        if (!res.ok) throw new Error('API ' + res.status);
        return res.json();
      })
      .then(function (json) {
        if (!json.success || !json.data || !json.data.sign) {
          body.innerHTML = '<p>Sign not found.</p>';
          return;
        }
        const sign = json.data.sign;
        const imgInfo = countryCode ? RoadSigns.getSignImageForCountry(sign, countryCode) : RoadSigns.getFirstSignImage(sign);
        body.innerHTML = '';
        if (imgInfo && RoadSigns.getImagesBase) {
          const wrap = document.createElement('div');
          wrap.className = 'sign-detail-image-wrap';
          const bigImg = document.createElement('img');
          bigImg.className = 'sign-detail-image';
          bigImg.alt = sign.reference;
          const baseUrl = RoadSigns.getImagesBase() + imgInfo.folder + '/' + imgInfo.ref;
          RoadSigns.tryImageFormats(baseUrl, bigImg, function () {
            if (window.console && console.error) console.error('No image found for ' + imgInfo.ref);
          });
          wrap.appendChild(bigImg);
          body.appendChild(wrap);
        }
        const pRef = document.createElement('p');
        pRef.className = 'sign-detail-ref';
        pRef.textContent = sign.reference;
        body.appendChild(pRef);
        const pName = document.createElement('p');
        pName.className = 'sign-detail-name';
        pName.textContent = sign.name || '';
        body.appendChild(pName);
        const nationalCode = countryCode ? RoadSigns.getNationalCodeForCountry(sign, countryCode) : null;
        if (nationalCode) {
          const codeLabel = document.createElement('p');
          codeLabel.className = 'sign-detail-codes-label';
          codeLabel.textContent = 'National code';
          body.appendChild(codeLabel);
          const codeVal = document.createElement('p');
          codeVal.className = 'sign-detail-national-code';
          const spanCode = document.createElement('span');
          spanCode.className = 'sign-detail-country';
          spanCode.textContent = nationalCode;
          codeVal.appendChild(spanCode);
          body.appendChild(codeVal);
        }
        if (sign.description) {
          const desc = document.createElement('p');
          desc.className = 'sign-detail-desc';
          desc.textContent = sign.description;
          body.appendChild(desc);
        }
        const footer = document.getElementById('signModalFooter');
        if (footer && countryCode && nationalCode) {
          footer.style.display = 'block';
          footer.innerHTML = '';
          const btnModify = document.createElement('button');
          btnModify.type = 'button';
          btnModify.className = 'modal-btn modal-btn--primary';
          btnModify.textContent = 'Modify';
          btnModify.addEventListener('click', function () {
            let rowKey = '';
            if (sign.declinations && sign.declinations.length) {
              const idx = sign.declinations.findIndex(function (d) {
                const loc = d.localizations && d.localizations[countryCode];
                const ref = RoadSigns.getReferenceFromLoc ? RoadSigns.getReferenceFromLoc(loc) : (loc && loc.reference);
                return ref === nationalCode;
              });
              if (idx >= 0) {
                const dec = sign.declinations[idx];
                rowKey = (dec.code != null && String(dec.code).trim() !== '') ? String(dec.code) : ('_idx_' + idx);
              }
            }
            RoadSigns.openSignEdit(reference, countryCode, nationalCode, rowKey ? { rowKey: rowKey } : undefined);
          });
          footer.appendChild(btnModify);
        } else if (footer) footer.style.display = 'none';
      })
      .catch(function (err) {
        body.innerHTML = '<p>Error: ' + RoadSigns.escapeHtml(err.message || '') + '</p>';
        const footer = document.getElementById('signModalFooter');
        if (footer) footer.style.display = 'none';
      });
  }

  /** Slot key to readable label for national codes list */
  function slotLabel(key) {
    const labels = { center: 'Center', left1: 'Left 1', left2: 'Left 2', left3: 'Left 3', right1: 'Right 1', right2: 'Right 2', right3: 'Right 3', top1: 'Top 1', top2: 'Top 2', top3: 'Top 3', bottom1: 'Bottom 1', bottom2: 'Bottom 2', bottom3: 'Bottom 3' };
    return labels[key] || key;
  }

  /** Opens the composite detail view: same charter as simple panel (image wrap, ref, name, national codes, description). */
  function openCompositeDetail(reference, countryCode, compositeId, rowKey) {
    const modal = document.getElementById('signModal');
    const body = document.getElementById('signModalBody');
    const titleEl = document.getElementById('signModalTitle');
    const footer = document.getElementById('signModalFooter');
    if (!modal || !body) return;
    modal.hidden = false;
    titleEl.textContent = reference;
    body.innerHTML = '<p class="modal-loading">Loading…</p>';
    if (footer) footer.style.display = 'none';
    const base = RoadSigns.getApiBase();
    const folder = RoadSigns.COUNTRY_TO_FOLDER && RoadSigns.COUNTRY_TO_FOLDER[countryCode] ? RoadSigns.COUNTRY_TO_FOLDER[countryCode] : countryCode;
    var compositeUrl = base + '/api/signs/composite?country=' + encodeURIComponent(countryCode) + '&reference=' + encodeURIComponent(compositeId);
    if (reference && (rowKey !== undefined && rowKey !== null)) {
      compositeUrl += '&signReference=' + encodeURIComponent(reference) + '&declinationCode=' + encodeURIComponent(String(rowKey));
    }
    Promise.all([
      fetch(compositeUrl).then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error('API ' + r.status);
        return r.json();
      }),
      fetch(base + '/api/signs?reference=' + encodeURIComponent(reference)).then(function (r) {
        if (!r.ok) return null;
        return r.json();
      })
    ]).then(function (results) {
      const compositeJson = results[0];
      const signJson = results[1];
      if (!compositeJson || !compositeJson.success || !compositeJson.data) {
        body.innerHTML = '<p>Composite not found.</p>';
        if (footer) footer.style.display = 'none';
        return;
      }
      var composite = compositeJson.data;
      var positions = composite.positions || {};
      var placementKey = (typeof RoadSigns.getPlacementKey === 'function' && reference && (rowKey !== undefined && rowKey !== null))
        ? RoadSigns.getPlacementKey(countryCode, reference, rowKey)
        : null;
      if (placementKey && RoadSigns.compositesData && RoadSigns.compositesData[placementKey] && RoadSigns.compositesData[placementKey].positions) {
        var memPos = RoadSigns.compositesData[placementKey].positions;
        if (Object.keys(memPos).length > Object.keys(positions).length) {
          positions = memPos;
          composite = { nationalId: composite.nationalId, country: composite.country, positions: positions };
        }
      }
      const sign = (signJson && signJson.success && signJson.data && signJson.data.sign) ? signJson.data.sign : null;
      body.innerHTML = '';

      var slotOrder = ['top1', 'top2', 'top3', 'left1', 'left2', 'left3', 'center', 'right1', 'right2', 'right3', 'bottom1', 'bottom2', 'bottom3'];
      function addSlot(key) {
        const ref = positions[key];
        if (!ref) return null;
        const slot = document.createElement('div');
        slot.className = 'composite-display-slot composite-display-slot--' + key;
        const img = document.createElement('img');
        img.alt = ref;
        RoadSigns.tryImageFormats(RoadSigns.getImagesBase() + folder + '/' + ref, img, null);
        slot.appendChild(img);
        return slot;
      }

      var grid = document.createElement('div');
      grid.className = 'composite-display-grid composite-detail-grid composite-detail-grid--all';
      var topCell = document.createElement('div');
      topCell.className = 'composite-display-cell composite-display-cell--top';
      ['top1', 'top2', 'top3'].forEach(function (k) { if (positions[k]) topCell.appendChild(addSlot(k)); });
      var leftCell = document.createElement('div');
      leftCell.className = 'composite-display-cell composite-display-cell--left';
      ['left1', 'left2', 'left3'].forEach(function (k) { if (positions[k]) leftCell.appendChild(addSlot(k)); });
      var centerCell = document.createElement('div');
      centerCell.className = 'composite-display-cell composite-display-cell--center';
      if (positions.center) centerCell.appendChild(addSlot('center'));
      var rightCell = document.createElement('div');
      rightCell.className = 'composite-display-cell composite-display-cell--right';
      ['right1', 'right2', 'right3'].forEach(function (k) { if (positions[k]) rightCell.appendChild(addSlot(k)); });
      var bottomCell = document.createElement('div');
      bottomCell.className = 'composite-display-cell composite-display-cell--bottom';
      ['bottom1', 'bottom2', 'bottom3'].forEach(function (k) { if (positions[k]) bottomCell.appendChild(addSlot(k)); });
      grid.appendChild(topCell);
      grid.appendChild(leftCell);
      grid.appendChild(centerCell);
      grid.appendChild(rightCell);
      grid.appendChild(bottomCell);

      var imageWrap = document.createElement('div');
      imageWrap.className = 'sign-detail-image-wrap composite-detail-image-wrap';
      imageWrap.appendChild(grid);
      body.appendChild(imageWrap);

      if (sign) {
        var pRef = document.createElement('p');
        pRef.className = 'sign-detail-ref';
        pRef.textContent = sign.reference || reference;
        body.appendChild(pRef);
        if (sign.name) {
          var pName = document.createElement('p');
          pName.className = 'sign-detail-name';
          pName.textContent = sign.name;
          body.appendChild(pName);
        }
      }

      var codeKeys = slotOrder.filter(function (k) { return positions[k]; });
      if (codeKeys.length === 0) {
        codeKeys = Object.keys(positions).filter(function (k) { return positions[k]; });
      }
      codeKeys.sort(function (a, b) {
        var i = slotOrder.indexOf(a);
        var j = slotOrder.indexOf(b);
        if (i >= 0 && j >= 0) return i - j;
        return String(a).localeCompare(String(b));
      });
      var codeLabel = document.createElement('p');
      codeLabel.className = 'sign-detail-codes-label';
      codeLabel.textContent = 'National codes (sub-panels)';
      body.appendChild(codeLabel);
      var codeVal = document.createElement('p');
      codeVal.className = 'sign-detail-national-code sign-detail-national-codes-list';
      codeVal.innerHTML = codeKeys.length > 0 ? codeKeys.map(function (k) {
        return slotLabel(k) + ': <span class="sign-detail-country">' + RoadSigns.escapeHtml(positions[k]) + '</span>';
      }).join('<br>') : '<span class="sign-detail-country">—</span>';
      body.appendChild(codeVal);

      if (sign && sign.description) {
        var pDesc = document.createElement('p');
        pDesc.className = 'sign-detail-desc';
        pDesc.textContent = sign.description;
        body.appendChild(pDesc);
      }

      if (footer) {
        footer.style.display = 'flex';
        footer.innerHTML = '';
        var btnModify = document.createElement('button');
        btnModify.type = 'button';
        btnModify.className = 'modal-btn modal-btn--primary';
        btnModify.textContent = 'Modify';
        btnModify.addEventListener('click', function () {
          RoadSigns.openSignEdit(reference, countryCode, compositeId, { rowKey: rowKey != null ? String(rowKey) : '' });
        });
        footer.appendChild(btnModify);
      }
    }).catch(function (err) {
      body.innerHTML = '<p>Error: ' + RoadSigns.escapeHtml(err.message || '') + '</p>';
      if (footer) footer.style.display = 'none';
    });
  }

  function openSignEdit(reference, countryCode, compositeId, options) {
    const modal = document.getElementById('signModal');
    const body = document.getElementById('signModalBody');
    const titleEl = document.getElementById('signModalTitle');
    const footer = document.getElementById('signModalFooter');
    if (!modal || !body) return;
    modal.hidden = false;
    titleEl.textContent = compositeId ? 'Edit composite panel' : 'Add composite panel';
    body.innerHTML = '<p class="modal-loading">Loading…</p>';
    if (footer) footer.style.display = 'none';
    const base = RoadSigns.getApiBase();
    const isAdd = !compositeId;
    const opts = options && typeof options === 'object' ? options : {};
    const rowKey = opts.rowKey !== undefined && opts.rowKey !== null ? String(opts.rowKey) : '';
    if (isAdd) {
      RoadSigns.renderEditForm(body, footer, reference, countryCode, null, { center: '' }, true, rowKey);
      return;
    }
    fetch(base + '/api/signs/composite?country=' + encodeURIComponent(countryCode) + '&reference=' + encodeURIComponent(compositeId))
      .then(function (res) {
        if (res.status === 404) return { success: false };
        if (!res.ok) throw new Error('API ' + res.status);
        return res.json();
      })
      .then(function (json) {
        const positions = (json.success && json.data && json.data.positions) ? json.data.positions : {};
        if (positions.center === undefined) positions.center = compositeId;
        RoadSigns.renderEditForm(body, footer, reference, countryCode, compositeId, positions, false, rowKey);
      })
      .catch(function (err) {
        body.innerHTML = '<p>Error: ' + RoadSigns.escapeHtml(err.message || '') + '</p>';
      });
  }

  function renderEditForm(body, footer, reference, countryCode, originalCompositeId, positions, isAdd, initialRowKey) {
    body.innerHTML = '';
    const categoryData = RoadSigns.categoryData;
    const sign = categoryData && categoryData.signs ? categoryData.signs.find(function (s) { return s.reference === reference; }) : null;
    const declinations = (sign && sign.declinations) ? sign.declinations : [];
    const showDeclinationSelect = declinations.length >= 1;

    if (showDeclinationSelect) {
      const declLabel = document.createElement('label');
      declLabel.className = 'edit-label';
      declLabel.textContent = 'Declination';
      body.appendChild(declLabel);
      const declSelect = document.createElement('select');
      declSelect.className = 'edit-select edit-declination-select';
      declSelect.id = 'editDeclinationSelect';
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = '—';
      declSelect.appendChild(emptyOpt);
      declinations.forEach(function (dec, idx) {
        const opt = document.createElement('option');
        const codeVal = (dec.code != null && String(dec.code).trim() !== '') ? String(dec.code) : ('_idx_' + idx);
        opt.value = codeVal;
        opt.textContent = RoadSigns.getDeclinationDisplayRef(dec) || ('Declination ' + (idx + 1));
        declSelect.appendChild(opt);
      });
      const currentKey = (initialRowKey != null) ? String(initialRowKey) : '';
      const firstVal = declinations.length > 0 ? ((declinations[0].code != null && String(declinations[0].code).trim() !== '') ? String(declinations[0].code) : '_idx_0') : '';
      declSelect.value = (currentKey && Array.prototype.find.call(declSelect.options, function (o) { return o.value === currentKey; })) ? currentKey : firstVal;
      body.appendChild(declSelect);
    }

    const panelLabel = document.createElement('label');
    panelLabel.className = 'edit-label';
    panelLabel.textContent = 'Sub-panels (id = image name per slot)';
    body.appendChild(panelLabel);
    const layoutEl = document.createElement('div');
    layoutEl.className = 'composite-layout-editor';
    body.appendChild(layoutEl);
    const state = { positions: {} };
    Object.keys(positions).forEach(function (k) { state.positions[k] = positions[k]; });
    if (!isAdd && state.positions.center === undefined && originalCompositeId) state.positions.center = originalCompositeId;
    RoadSigns.renderLayoutEditor(layoutEl, state, countryCode);
    if (footer) {
      footer.style.display = 'flex';
      footer.innerHTML = '';
      if (!isAdd) {
        const btnDel = document.createElement('button');
        btnDel.type = 'button';
        btnDel.className = 'modal-btn modal-btn--danger';
        btnDel.textContent = 'Delete';
        btnDel.addEventListener('click', function () {
          if (!confirm('Remove this composite panel?')) return;
          const base = RoadSigns.getApiBase();
          const oldPlacementKey = RoadSigns.getPlacementKey(countryCode, reference, (initialRowKey != null) ? String(initialRowKey) : '');
          fetch(base + '/api/signs/composite?country=' + encodeURIComponent(countryCode) + '&reference=' + encodeURIComponent(originalCompositeId), { method: 'DELETE' })
            .then(function () {
              delete RoadSigns.compositesData[oldPlacementKey];
              delete RoadSigns.compositesData[RoadSigns.getCompositeKey(countryCode, originalCompositeId)];
              RoadSigns.updateTableCell(reference, countryCode, originalCompositeId, undefined, (initialRowKey != null) ? String(initialRowKey) : '');
              closeSignModal();
            });
        });
        footer.appendChild(btnDel);
      }
      const btnSave = document.createElement('button');
      btnSave.type = 'button';
      btnSave.className = 'modal-btn modal-btn--primary';
      btnSave.textContent = 'Save';
      btnSave.addEventListener('click', function () {
        const effectiveId = (state.positions.center || '').trim();
        if (!effectiveId) {
          alert('Set at least the center slot (id = image name).');
          return;
        }
        const declSelectEl = document.getElementById('editDeclinationSelect');
        let selectedRowKey = (initialRowKey !== undefined && initialRowKey !== null) ? String(initialRowKey) : '';
        if (declSelectEl && declSelectEl.value !== undefined) selectedRowKey = String(declSelectEl.value);
        else if (declinations.length === 1) selectedRowKey = (declinations[0].code != null && String(declinations[0].code).trim() !== '') ? String(declinations[0].code) : '_idx_0';
        const base = RoadSigns.getApiBase();
        const savePut = function () {
          const body = { country: countryCode, nationalId: effectiveId, positions: state.positions, signReference: reference, declinationCode: selectedRowKey };
          return fetch(base + '/api/signs/composite', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          }).then(function (res) { return res.json(); });
        };
        let chain;
        const oldPlacementKey = RoadSigns.getPlacementKey(countryCode, reference, (initialRowKey != null) ? String(initialRowKey) : '');
        const declinationChanged = !isAdd && selectedRowKey !== (initialRowKey != null ? String(initialRowKey) : '');
        if (!isAdd && originalCompositeId && effectiveId !== originalCompositeId) {
          chain = fetch(base + '/api/signs/composite?country=' + encodeURIComponent(countryCode) + '&reference=' + encodeURIComponent(originalCompositeId), { method: 'DELETE' })
            .then(function () {
              delete RoadSigns.compositesData[oldPlacementKey];
              delete RoadSigns.compositesData[RoadSigns.getCompositeKey(countryCode, originalCompositeId)];
              return savePut();
            });
        } else if (declinationChanged) {
          chain = fetch(base + '/api/signs/composite?country=' + encodeURIComponent(countryCode) + '&reference=' + encodeURIComponent(originalCompositeId), { method: 'DELETE' })
            .then(function () {
              delete RoadSigns.compositesData[oldPlacementKey];
              delete RoadSigns.compositesData[RoadSigns.getCompositeKey(countryCode, originalCompositeId)];
              return savePut();
            });
        } else {
          chain = savePut();
        }
        chain.then(function (json) {
          const placementKey = RoadSigns.getPlacementKey(countryCode, reference, selectedRowKey);
          const data = (json && json.success && json.data && json.data.positions) ? json.data : { country: countryCode, nationalId: effectiveId, positions: state.positions };
          RoadSigns.compositesData[placementKey] = data;
          if (isAdd) {
            RoadSigns.updateEmptyCellAfterAdd(reference, countryCode, effectiveId, selectedRowKey);
          } else {
            if (selectedRowKey !== (initialRowKey != null ? String(initialRowKey) : '')) {
              RoadSigns.updateTableCellClearComposite(reference, countryCode, originalCompositeId);
              RoadSigns.updateEmptyCellAfterAdd(reference, countryCode, effectiveId, selectedRowKey);
            } else {
              RoadSigns.updateTableCell(reference, countryCode, effectiveId, originalCompositeId, selectedRowKey);
            }
          }
          closeSignModal();
        });
      });
      const btnCancel = document.createElement('button');
      btnCancel.type = 'button';
      btnCancel.className = 'modal-btn';
      btnCancel.textContent = 'Cancel';
      btnCancel.addEventListener('click', function () {
        if (isAdd) closeSignModal();
        else RoadSigns.openSignDetail(reference, countryCode);
      });
      footer.appendChild(btnSave);
      footer.appendChild(btnCancel);
    }
  }

  (function initModal() {
    const modal = document.getElementById('signModal');
    if (!modal) return;
    const backdrop = modal.querySelector('.modal-backdrop');
    const closeBtn = modal.querySelector('.modal-close');
    if (backdrop) backdrop.addEventListener('click', closeSignModal);
    if (closeBtn) closeBtn.addEventListener('click', closeSignModal);
  })();

  RoadSigns.closeSignModal = closeSignModal;
  RoadSigns.openSignDetail = openSignDetail;
  RoadSigns.openCompositeDetail = openCompositeDetail;
  RoadSigns.openSignEdit = openSignEdit;
  RoadSigns.renderEditForm = renderEditForm;
})();
