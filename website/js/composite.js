(function () {
  'use strict';
  const RoadSigns = window.RoadSigns;
  if (!RoadSigns) return;
  const COUNTRY_TO_FOLDER = RoadSigns.COUNTRY_TO_FOLDER;
  const MAX_PER_SIDE = RoadSigns.MAX_PER_SIDE;

  function openImagePreview(imgOrSrc, baseUrlWithoutExt, refLabel) {
    const src = imgOrSrc && imgOrSrc.src;
    const url = (src && String(src).indexOf('blob:') === 0)
      ? src
      : (src || (baseUrlWithoutExt ? baseUrlWithoutExt + '.svg' : ''));
    if (!url) return;
    const w = window.open('', '_blank', 'width=720,height=640,scrollbars=yes,resizable=yes');
    if (!w) return;
    w.document.write(
      '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Preview: ' + (refLabel || '') + '</title>' +
      '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f0f0f0;}' +
      'img{max-width:100%;max-height:100vh;object-fit:contain;}</style></head><body>' +
      '<img src="' + url.replace(/"/g, '&quot;') + '" alt="' + (refLabel || 'Preview').replace(/"/g, '&quot;') + '">' +
      '</body></html>'
    );
    w.document.close();
  }

  function setSlotImageFromRef(imgWrap, folder, ref, onNoImage) {
    imgWrap.innerHTML = '';
    if (!ref) return;
    const img = document.createElement('img');
    img.alt = ref;
    imgWrap.appendChild(img);
    const imgBase = RoadSigns.getImagesBase ? RoadSigns.getImagesBase() : '';
    if (imgBase) RoadSigns.tryImageFormats(imgBase + folder + '/' + ref, img, onNoImage);
  }

  function addSlot(parent, key, positions, state, countryCode, base, folder) {
    let ref = positions[key] !== undefined ? positions[key] : '';
    const wrap = document.createElement('div');
    wrap.className = 'composite-slot';
    const currentWrap = document.createElement('div');
    currentWrap.className = 'composite-slot-current';
    const imgWrap = document.createElement('div');
    imgWrap.className = 'composite-slot-image';
    setSlotImageFromRef(imgWrap, folder, ref, function () {
      if (window.console && console.error) console.error('No image found for ' + ref);
    });
    const refInput = document.createElement('input');
    refInput.type = 'text';
    refInput.className = 'composite-slot-ref composite-slot-ref-input';
    refInput.placeholder = 'id (image name)';
    refInput.value = ref || '';
    refInput.title = 'Sub-panel id = image name';
    function applyRefFromInput() {
      const newRef = (refInput.value || '').trim();
      state.positions[key] = newRef;
      ref = newRef;
      setSlotImageFromRef(imgWrap, folder, newRef, function () {
        if (newRef && window.console && console.error) console.error('No image found for ' + newRef);
      });
    }
    refInput.addEventListener('change', applyRefFromInput);
    refInput.addEventListener('blur', applyRefFromInput);
    const btnChange = document.createElement('button');
    btnChange.type = 'button';
    btnChange.className = 'composite-slot-change-btn';
    btnChange.textContent = 'Change';
    const pickerPanel = document.createElement('div');
    pickerPanel.className = 'composite-slot-picker';
    pickerPanel.hidden = true;
    function setSelected(newRef) {
      const val = newRef || '';
      state.positions[key] = val;
      ref = val;
      refInput.value = val;
      setSlotImageFromRef(imgWrap, base, folder, val, function () {
        if (newRef && window.console && console.error) console.error('No image found for ' + newRef);
      });
      pickerPanel.hidden = true;
    }
    function buildPicker() {
      pickerPanel.innerHTML = '';
      const tabs = document.createElement('div');
      tabs.className = 'composite-picker-tabs';
      const btnSelect = document.createElement('button');
      btnSelect.type = 'button';
      btnSelect.className = 'composite-picker-tab active';
      btnSelect.textContent = 'Select existing';
      const btnUpload = document.createElement('button');
      btnUpload.type = 'button';
      btnUpload.className = 'composite-picker-tab';
      btnUpload.textContent = 'Upload';
      const content = document.createElement('div');
      content.className = 'composite-picker-content';
      function showSelect() {
        btnSelect.classList.add('active');
        btnUpload.classList.remove('active');
        content.innerHTML = '';
        content.className = 'composite-picker-content composite-picker-select';
        const grid = document.createElement('div');
        grid.className = 'composite-picker-grid';
        RoadSigns.loadCountryImages(countryCode, function (refs) {
          refs.forEach(function (r) {
            const item = document.createElement('div');
            item.className = 'composite-picker-item' + (r === ref ? ' selected' : '');
            const thumb = document.createElement('div');
            thumb.className = 'composite-picker-item-img';
            const img = document.createElement('img');
            img.alt = r;
            const imgBase = RoadSigns.getImagesBase ? RoadSigns.getImagesBase() : '';
            if (imgBase) RoadSigns.tryImageFormats(imgBase + folder + '/' + r, img, null);
            thumb.appendChild(img);
            const label = document.createElement('span');
            label.className = 'composite-picker-item-ref';
            label.textContent = r;
            const actions = document.createElement('div');
            actions.className = 'composite-picker-item-actions';
            const btnView = document.createElement('button');
            btnView.type = 'button';
            btnView.className = 'composite-picker-btn-view';
            btnView.title = 'View full size';
            btnView.textContent = 'View';
            btnView.addEventListener('click', function (e) {
              e.preventDefault();
              e.stopPropagation();
              openImagePreview(img, imgBase ? imgBase + folder + '/' + r : '', r);
            });
            const btnSelectItem = document.createElement('button');
            btnSelectItem.type = 'button';
            btnSelectItem.className = 'composite-picker-btn-select';
            btnSelectItem.textContent = 'Select';
            btnSelectItem.addEventListener('click', function (e) {
              e.preventDefault();
              e.stopPropagation();
              setSelected(r);
            });
            actions.appendChild(btnView);
            actions.appendChild(btnSelectItem);
            item.appendChild(thumb);
            item.appendChild(label);
            item.appendChild(actions);
            item.addEventListener('click', function (e) {
              if (e.target === btnView || e.target === btnSelectItem || btnView.contains(e.target) || btnSelectItem.contains(e.target)) return;
              setSelected(r);
            });
            grid.appendChild(item);
          });
          content.appendChild(grid);
        });
      }
      function showUpload() {
        btnUpload.classList.add('active');
        btnSelect.classList.remove('active');
        content.innerHTML = '';
        content.className = 'composite-picker-content composite-picker-upload';
        const refInputUpload = document.createElement('input');
        refInputUpload.type = 'text';
        refInputUpload.placeholder = 'Reference (e.g. DE-999)';
        refInputUpload.className = 'composite-picker-upload-ref';
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/svg+xml,image/png,image/jpeg,image/jpg';
        fileInput.className = 'composite-picker-upload-file';
        const uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.className = 'modal-btn modal-btn--primary';
        uploadBtn.textContent = 'Upload';
        const msg = document.createElement('div');
        msg.className = 'composite-picker-upload-msg';
        uploadBtn.addEventListener('click', function () {
          const refName = (refInputUpload.value || '').trim();
          if (!refName) {
            msg.textContent = 'Enter a reference name.';
            msg.className = 'composite-picker-upload-msg error';
            return;
          }
          if (!fileInput.files || !fileInput.files[0]) {
            msg.textContent = 'Choose a file.';
            msg.className = 'composite-picker-upload-msg error';
            return;
          }
          msg.textContent = 'Uploading…';
          msg.className = 'composite-picker-upload-msg';
          const formData = new FormData();
          formData.append('country', countryCode);
          formData.append('reference', refName);
          formData.append('file', fileInput.files[0]);
          fetch(base + '/api/signs/upload-image', {
            method: 'POST',
            body: formData
          }).then(function (res) { return res.json(); }).then(function (json) {
            if (json.success && json.data && json.data.reference) {
              const newRef = json.data.reference;
              setSelected(newRef);
              const imgBase = RoadSigns.getImagesBase ? RoadSigns.getImagesBase() : '';
              const previewUrl = imgBase ? imgBase + folder + '/' + newRef + '.svg' : '';
              openImagePreview({ src: previewUrl }, imgBase ? imgBase + folder + '/' + newRef : '', newRef);
            } else {
              msg.textContent = json.message || 'Upload failed.';
              msg.className = 'composite-picker-upload-msg error';
            }
          }).catch(function () {
            msg.textContent = 'Upload failed.';
            msg.className = 'composite-picker-upload-msg error';
          });
        });
        content.appendChild(refInputUpload);
        content.appendChild(fileInput);
        content.appendChild(uploadBtn);
        content.appendChild(msg);
      }
      btnSelect.addEventListener('click', showSelect);
      btnUpload.addEventListener('click', showUpload);
      tabs.appendChild(btnSelect);
      tabs.appendChild(btnUpload);
      pickerPanel.appendChild(tabs);
      pickerPanel.appendChild(content);
      showSelect();
    }
    btnChange.addEventListener('click', function () {
      if (pickerPanel.hidden) {
        buildPicker();
        pickerPanel.hidden = false;
      } else {
        pickerPanel.hidden = true;
      }
    });
    currentWrap.appendChild(imgWrap);
    currentWrap.appendChild(refInput);
    currentWrap.appendChild(btnChange);
    wrap.appendChild(currentWrap);
    wrap.appendChild(pickerPanel);
    parent.appendChild(wrap);
  }

  function addPlusButton(parent, side, currentCount, state, layoutContainer, countryCode) {
    if (currentCount >= MAX_PER_SIDE) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'composite-plus-btn';
    btn.textContent = '+';
    btn.title = 'Add ' + side;
    btn.addEventListener('click', function () {
      const next = currentCount + 1;
      state.positions[side + next] = '';
      RoadSigns.renderLayoutEditor(layoutContainer, state, countryCode);
    });
    parent.appendChild(btn);
  }

  function renderLayoutEditor(container, state, countryCode) {
    const positions = state.positions;
    const leftCount = [1, 2, 3].filter(function (i) { return positions['left' + i] !== undefined; }).length;
    const rightCount = [1, 2, 3].filter(function (i) { return positions['right' + i] !== undefined; }).length;
    const topCount = [1, 2, 3].filter(function (i) { return positions['top' + i] !== undefined; }).length;
    const bottomCount = [1, 2, 3].filter(function (i) { return positions['bottom' + i] !== undefined; }).length;
    const folder = COUNTRY_TO_FOLDER[countryCode];
    const base = RoadSigns.getApiBase();
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'composite-grid';
    const topCell = document.createElement('div');
    topCell.className = 'composite-grid-cell composite-grid-cell--top';
    addPlusButton(topCell, 'top', topCount, state, container, countryCode);
    for (let t = 1; t <= topCount; t++) addSlot(topCell, 'top' + t, positions, state, countryCode, base, folder);
    const leftCell = document.createElement('div');
    leftCell.className = 'composite-grid-cell composite-grid-cell--left';
    addPlusButton(leftCell, 'left', leftCount, state, container, countryCode);
    for (let l = 1; l <= leftCount; l++) addSlot(leftCell, 'left' + l, positions, state, countryCode, base, folder);
    const centerCell = document.createElement('div');
    centerCell.className = 'composite-grid-cell composite-grid-cell--center';
    addSlot(centerCell, 'center', positions, state, countryCode, base, folder);
    const rightCell = document.createElement('div');
    rightCell.className = 'composite-grid-cell composite-grid-cell--right';
    addPlusButton(rightCell, 'right', rightCount, state, container, countryCode);
    for (let r = 1; r <= rightCount; r++) addSlot(rightCell, 'right' + r, positions, state, countryCode, base, folder);
    const bottomCell = document.createElement('div');
    bottomCell.className = 'composite-grid-cell composite-grid-cell--bottom';
    addPlusButton(bottomCell, 'bottom', bottomCount, state, container, countryCode);
    for (let b = 1; b <= bottomCount; b++) addSlot(bottomCell, 'bottom' + b, positions, state, countryCode, base, folder);
    grid.appendChild(topCell);
    grid.appendChild(leftCell);
    grid.appendChild(centerCell);
    grid.appendChild(rightCell);
    grid.appendChild(bottomCell);
    container.appendChild(grid);
  }

  RoadSigns.renderLayoutEditor = renderLayoutEditor;
})();
