// État de l'application
const state = {
    viennaConvention: null,
    countries: {},
    currentCountry: null,
    selectedViennaSign: null,
    selectedCountrySign: null,
    selectedViennaCategory: 'VIENNA-A', // Catégorie sélectionnée par défaut
    selectedCountrySubfolder: null, // Sous-dossier sélectionné
    mappings: {}, // { countryCode: { nationalId: viennaId } }
    countryImages: {} // { countryCode: { nationalId: { filename } } }
};

// Charger les données
async function loadData() {
    try {
        // Charger Vienna Convention avec cache-buster
        const cacheTime = new Date().getTime();
        const viennaResponse = await fetch(`../vienna-convention/road_signs_all.json?t=${cacheTime}`);
        state.viennaConvention = await viennaResponse.json();

        // Extraire les mappings existants de Vienna Convention
        extractMappings();

        // Charger les images de chaque pays
        const countryNames = ['austria', 'belgium', 'bulgaria', 'croatia', 'cyprus', 'czech-republic', 'denmark', 'estonia', 'finland', 'france', 'germany', 'greece', 'hungary', 'ireland', 'italy', 'latvia', 'lithuania', 'luxembourg', 'malta', 'netherlands', 'poland', 'portugal', 'romania', 'slovakia', 'slovenia', 'spain', 'sweden'];

        for (const countryName of countryNames) {
            const countryCode = getCountryCode(countryName);
            state.countries[countryCode] = {
                name: countryName,
                code: countryCode
            };
            state.countryImages[countryCode] = {};

            // Charger les images en listant le dossier
            await loadCountryImages(countryName, countryCode);
        }

        // Remplir le sélecteur de pays
        populateCountrySelector();

    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
    }
}

async function loadCountryImages(countryName, countryCode) {
    try {
        const response = await fetch(`../countries/${countryName}/`);
        if (!response.ok) return;

        const html = await response.text();

        // Parser les fichiers images directement dans le dossier
        const imageRegex = /href="([^"]+\.(png|jpg|jpeg|svg|gif|webp))"/gi;
        let match;

        while ((match = imageRegex.exec(html)) !== null) {
            const filename = match[1];
            // Extraire l'ID national du nom de fichier (ex: FR-A1a.svg -> FR-A1a)
            const nationalId = filename.substring(0, filename.lastIndexOf('.'));

            if (nationalId && !nationalId.includes('/')) {
                state.countryImages[countryCode][nationalId] = {
                    filename: filename
                };
            }
        }

        // Parser les sous-dossiers (signs_1, signs_2, etc.) pour les pays avec beaucoup de panneaux
        const folderRegex = /href="(signs_\d+)\/"/g;
        let folderMatch;

        while ((folderMatch = folderRegex.exec(html)) !== null) {
            const subfolder = folderMatch[1];
            try {
                const subfolderResponse = await fetch(`../countries/${countryName}/${subfolder}/`);
                if (!subfolderResponse.ok) continue;

                const subfolderHtml = await subfolderResponse.text();
                const subImageRegex = /href="([^"]+\.(png|jpg|jpeg|svg|gif|webp))"/gi;
                let subMatch;

                while ((subMatch = subImageRegex.exec(subfolderHtml)) !== null) {
                    const filename = subMatch[1];
                    const nationalId = filename.substring(0, filename.lastIndexOf('.'));

                    if (nationalId && !nationalId.includes('/')) {
                        state.countryImages[countryCode][nationalId] = {
                            subfolder: subfolder,
                            filename: filename
                        };
                    }
                }
            } catch (e) {
                console.log(`Impossible de charger les images du sous-dossier ${subfolder}`);
            }
        }
    } catch (e) {
        console.log(`Impossible de charger les images de ${countryName}`);
    }
}

function getCountryCode(countryName) {
    const codes = {
        'austria': 'at',
        'belgium': 'be',
        'bulgaria': 'bg',
        'croatia': 'hr',
        'cyprus': 'cy',
        'czech-republic': 'cz',
        'denmark': 'dk',
        'estonia': 'ee',
        'finland': 'fi',
        'france': 'fr',
        'germany': 'de',
        'greece': 'gr',
        'hungary': 'hu',
        'ireland': 'ie',
        'italy': 'it',
        'latvia': 'lv',
        'lithuania': 'lt',
        'luxembourg': 'lu',
        'malta': 'mt',
        'netherlands': 'nl',
        'poland': 'pl',
        'portugal': 'pt',
        'romania': 'ro',
        'slovakia': 'sk',
        'slovenia': 'si',
        'spain': 'es',
        'sweden': 'se'
    };
    return codes[countryName] || countryName.substring(0, 2).toLowerCase();
}

function extractMappings() {
    if (!state.viennaConvention) return;

    state.viennaConvention.categories.forEach(category => {
        category.signs.forEach(sign => {
            sign.declinations.forEach(decl => {
                if (decl.localizations) {
                    Object.entries(decl.localizations).forEach(([countryCode, data]) => {
                        if (!state.mappings[countryCode]) {
                            state.mappings[countryCode] = {};
                        }
                        if (data.position && data.position.center) {
                            // Stocker le CODE de la déclinaison, pas la référence du panneau!
                            state.mappings[countryCode][data.position.center] = decl.code;
                        }
                    });
                }
            });
        });
    });
}

function populateCountrySelector() {
    const select = document.getElementById('countrySelect');
    const countries = Object.values(state.countries).sort((a, b) => a.name.localeCompare(b.name));

    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = country.name.charAt(0).toUpperCase() + country.name.slice(1).replace('-', ' ');
        select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
        state.currentCountry = e.target.value;
        state.selectedViennaSign = null;
        state.selectedCountrySign = null;
        renderMappingArea();
        renderMappingsList();
    });
}

function getViennaSignsFlat() {
    const signs = [];
    if (!state.viennaConvention) return signs;

    state.viennaConvention.categories.forEach(category => {
        category.signs.forEach(sign => {
            // Afficher les déclinaisons au lieu des panneaux principaux
            sign.declinations.forEach(decl => {
                const imagePath = getViennaImagePath(decl.code);
                signs.push({
                    reference: decl.code,
                    signReference: sign.reference,
                    name: sign.name,
                    category: category.categoryName,
                    categoryCode: category.category,
                    imagePath: imagePath
                });
            });
        });
    });

    return signs;
}

function getViennaImagePath(declCode) {
    const categoryMap = {
        'VIENNA-A': 'A-Danger',
        'VIENNA-B': 'B-Priority',
        'VIENNA-C': 'C-Prohibitory',
        'VIENNA-D': 'D-Mandatory',
        'VIENNA-E': 'E-Special',
        'VIENNA-F': 'F-Information',
        'VIENNA-G': 'G-Direction',
        'VIENNA-H': 'H-Additional',
        'VIENNA-S': 'S-Other',
        'VIENNA-SD': 'SD-OtherDirection',
        'OTHER-A': 'A-Danger',
        'OTHER-B': 'B-Priority',
        'OTHER-C': 'C-Prohibitory',
        'OTHER-D': 'D-Mandatory',
        'OTHER-E': 'E-Special',
        'OTHER-F': 'F-Information',
        'OTHER-G': 'G-Direction',
        'OTHER-H': 'H-Additional',
        'OTHER-S': 'S-Other',
        'OTHER-SD': 'SD-OtherDirection'
    };

    let category = null;
    const supportedFormats = ['svg', 'png', 'jpg', 'jpeg', 'gif', 'webp'];

    for (const [key, val] of Object.entries(categoryMap)) {
        if (declCode.startsWith(key)) {
            category = val;
            break;
        }
    }

    if (category) {
        const parts = declCode.split('-');
        const folderName = parts[0] + '-' + parts[1];
        const basePath = `../vienna-convention/road_signs_vienna/${category}/${folderName}/${declCode}`;

        // Retourner avec SVG par défaut (le plus courant)
        return basePath + '.svg';
    }

    return null;
}

function renderMappingArea() {
    const mappingArea = document.getElementById('mappingArea');

    if (!state.currentCountry) {
        mappingArea.innerHTML = '<div class="no-country-message">Sélectionnez un pays pour commencer le mapping</div>';
        return;
    }

    const country = state.countries[state.currentCountry];
    const countryImages = state.countryImages[state.currentCountry] || {};
    let viennaSigns = getViennaSignsFlat();

    // Filtrer par catégorie sélectionnée
    viennaSigns = viennaSigns.filter(sign => sign.reference.startsWith(state.selectedViennaCategory));

    const countryImagesArray = Object.entries(countryImages).map(([nationalId, imgData]) => ({
        nationalId,
        ...imgData
    }));

    // Détecter les sous-dossiers disponibles
    const subfolders = new Set();
    Object.values(countryImages).forEach(img => {
        if (img.subfolder) {
            subfolders.add(img.subfolder);
        }
    });

    // Filtrer les images par sous-dossier si sélectionné
    let filteredCountryImages = countryImagesArray;
    if (state.selectedCountrySubfolder) {
        filteredCountryImages = countryImagesArray.filter(img =>
            img.subfolder === state.selectedCountrySubfolder
        );
    } else if (subfolders.size > 0) {
        // Si des sous-dossiers existent et qu'aucun n'est sélectionné, afficher seulement le premier
        const firstSubfolder = Array.from(subfolders).sort()[0];
        state.selectedCountrySubfolder = firstSubfolder;
        filteredCountryImages = countryImagesArray.filter(img =>
            img.subfolder === firstSubfolder
        );
    }

    mappingArea.innerHTML = `
        <div class="panel-column">
            <div class="column-title">🚩 ${country.name.charAt(0).toUpperCase() + country.name.slice(1).replace('-', ' ')}</div>
            ${subfolders.size > 0 ? `
                <div style="padding: 10px; background: white; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <select id="countrySubfolderSelect" style="width: 100%; padding: 8px 12px; border: 2px solid #ddd; border-radius: 4px; font-size: 13px; cursor: pointer; background: white;">
                        ${Array.from(subfolders).sort().map((sf, idx) => `
                            <option value="${sf}" ${state.selectedCountrySubfolder === sf ? 'selected' : ''}>
                                ${sf.replace('signs_', 'Lot ')} (${countryImagesArray.filter(img => img.subfolder === sf).length} panneaux)
                            </option>
                        `).join('')}
                    </select>
                </div>
            ` : ''}
            <div class="panels-container" id="countryPanel">
                ${filteredCountryImages.length > 0 ? filteredCountryImages.map(img => {
                    const isMapped = state.mappings[state.currentCountry] && state.mappings[state.currentCountry][img.nationalId];
                    const imagePath = img.subfolder ?
                        `../countries/${country.name}/${img.subfolder}/${img.filename}` :
                        `../countries/${country.name}/${img.filename}`;
                    return `
                        <div class="panel-item ${isMapped ? 'mapped' : ''}" data-country-id="${img.nationalId}">
                            ${isMapped ? `<div style="position: absolute; top: 4px; left: 4px; background: #4caf50; color: white; padding: 4px 8px; border-radius: 3px; font-size: 8px; font-weight: 600; z-index: 10; max-width: 95%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${isMapped}</div>` : ''}
                            <img src="${imagePath}" alt="${img.nationalId}" class="panel-image" onerror="this.style.display='none'">
                            <div class="panel-id">${img.nationalId}</div>
                        </div>
                    `;
                }).join('') : '<div class="empty-country">Aucune image disponible pour ce pays</div>'}
            </div>
        </div>

        <div class="center-column">
            <div class="selection-info" id="countryInfo">
                <div class="selection-label">Pays</div>
                <p id="countryInfoText">Sélectionnez un panneau</p>
            </div>
            <button class="mapper-btn" id="mapperBtn" disabled>🔗 Mapper</button>
            <button class="mapper-btn clear-btn" id="clearBtn" disabled>✕ Effacer</button>
            <div class="selection-info" id="viennaInfo">
                <div class="selection-label">Convention de Vienne</div>
                <p id="viennaInfoText">Sélectionnez un panneau</p>
            </div>
        </div>

        <div class="panel-column">
            <div class="column-title">🌍 Convention de Vienne (Déclinaisons)</div>
            <div style="padding: 10px; background: white; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 8px;">
                <select id="viennaCategorySelect" style="padding: 8px 12px; border: 2px solid #ddd; border-radius: 4px; font-size: 13px; cursor: pointer; background: white;">
                    <option value="VIENNA-A">A - Danger warning signs</option>
                    <option value="VIENNA-B">B - Priority signs</option>
                    <option value="VIENNA-C">C - Prohibitory signs</option>
                    <option value="VIENNA-D">D - Mandatory signs</option>
                    <option value="VIENNA-E">E - Special signs</option>
                    <option value="VIENNA-F">F - Information signs</option>
                    <option value="VIENNA-G">G - Direction signs</option>
                    <option value="VIENNA-H">H - Additional signs</option>
                    <option value="VIENNA-S">S - Other signs</option>
                    <option value="VIENNA-SD">SD - Other direction signs</option>
                    <optgroup label="Non-VIENNA Signs">
                        <option value="OTHER-A">OTHER-A - Danger warning signs</option>
                        <option value="OTHER-B">OTHER-B - Priority signs</option>
                        <option value="OTHER-C">OTHER-C - Prohibitory signs</option>
                        <option value="OTHER-D">OTHER-D - Mandatory signs</option>
                        <option value="OTHER-E">OTHER-E - Special signs</option>
                        <option value="OTHER-F">OTHER-F - Information signs</option>
                        <option value="OTHER-G">OTHER-G - Direction signs</option>
                        <option value="OTHER-H">OTHER-H - Additional signs</option>
                        <option value="OTHER-S">OTHER-S - Other signs</option>
                        <option value="OTHER-SD">OTHER-SD - Other direction signs</option>
                    </optgroup>
                </select>
                <input type="text" id="viennaSearchInput" placeholder="🔍 Rechercher par ID ou nom..." style="width: 100%; padding: 8px 12px; border: 2px solid #ddd; border-radius: 4px; font-size: 13px; transition: border-color 0.3s;">
            </div>
            <div class="panels-container" id="viennaPanel">
                ${viennaSigns.map(sign => {
                    const mappingsForCountry = state.mappings[state.currentCountry] || {};
                    const isMapped = Object.values(mappingsForCountry).includes(sign.reference);
                    return `
                        <div class="panel-item ${isMapped ? 'mapped' : ''}" data-vienna-id="${sign.reference}">
                            ${sign.imagePath ?
                                `<img src="${sign.imagePath}" alt="${sign.reference}" class="panel-image" onerror="this.style.display='none'">` :
                                `<div style="width: 80px; height: 70px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; padding: 4px; text-align: center; word-break: break-all;">
                                    ${sign.reference.substring(0, 8)}
                                </div>`
                            }
                            <div class="panel-id" style="font-size: 9px;">${sign.reference}</div>
                            <div class="panel-name">${sign.name}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    // Event listeners
    document.querySelectorAll('#viennaPanel .panel-item').forEach(item => {
        item.addEventListener('click', () => selectViennaSign(item));
    });

    document.querySelectorAll('#countryPanel .panel-item').forEach(item => {
        item.addEventListener('click', () => selectCountrySign(item));
    });

    document.getElementById('mapperBtn').addEventListener('click', performMapping);
    document.getElementById('clearBtn').addEventListener('click', clearSelection);

    // S'assurer que les panneaux Vienna avec mappings ont la classe "mapped"
    viennaSigns.forEach(sign => {
        const isMapped = state.mappings[state.currentCountry] &&
                        Object.values(state.mappings[state.currentCountry]).includes(sign.reference);
        if (isMapped) {
            const item = document.querySelector(`[data-vienna-id="${sign.reference}"]`);
            if (item) {
                item.classList.add('mapped');
            }
        }
    });

    // Ajouter le listener pour le changement de catégorie Vienna
    const categorySelect = document.getElementById('viennaCategorySelect');
    if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
            state.selectedViennaCategory = e.target.value;
            renderMappingArea();
        });
    }

    // Ajouter le listener pour le changement de sous-dossier du pays
    const subfolderSelect = document.getElementById('countrySubfolderSelect');
    if (subfolderSelect) {
        subfolderSelect.addEventListener('change', (e) => {
            state.selectedCountrySubfolder = e.target.value;
            renderMappingArea();
        });
    }

    // Ajouter la logique de recherche
    const searchInput = document.getElementById('viennaSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const panelItems = document.querySelectorAll('#viennaPanel .panel-item');

            panelItems.forEach(item => {
                const viennaId = item.dataset.viennaId.toLowerCase();
                const panelName = item.textContent.toLowerCase();

                if (viennaId.includes(searchTerm) || panelName.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
}

function selectViennaSign(item) {
    document.querySelectorAll('#viennaPanel .panel-item').forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    state.selectedViennaSign = item.dataset.viennaId;
    updateCenterInfo();
    updateMapperBtn();
}

function selectCountrySign(item) {
    document.querySelectorAll('#countryPanel .panel-item').forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    state.selectedCountrySign = item.dataset.countryId;
    updateCenterInfo();
    updateMapperBtn();
}

function updateCenterInfo() {
    const viennaInfo = document.getElementById('viennaInfoText');
    const countryInfo = document.getElementById('countryInfoText');
    const viennaInfoDiv = document.getElementById('viennaInfo');
    const countryInfoDiv = document.getElementById('countryInfo');

    if (state.selectedViennaSign) {
        const viennaSigns = getViennaSignsFlat();
        const sign = viennaSigns.find(s => s.reference === state.selectedViennaSign);
        viennaInfo.innerHTML = `<strong>${state.selectedViennaSign}</strong><br><small>${sign.signReference}</small>`;
        viennaInfoDiv.classList.add('active');
    } else {
        viennaInfo.textContent = 'Sélectionnez une déclinaison';
        viennaInfoDiv.classList.remove('active');
    }

    if (state.selectedCountrySign) {
        countryInfo.innerHTML = `<strong>${state.selectedCountrySign}</strong>`;
        countryInfoDiv.classList.add('active');
    } else {
        countryInfo.textContent = 'Sélectionnez un panneau';
        countryInfoDiv.classList.remove('active');
    }
}

function updateMapperBtn() {
    const btn = document.getElementById('mapperBtn');
    const clearBtn = document.getElementById('clearBtn');
    const hasBoth = state.selectedViennaSign && state.selectedCountrySign;
    btn.disabled = !hasBoth;

    if (hasBoth) {
        const existingMapping = state.mappings[state.currentCountry]?.[state.selectedCountrySign];
        clearBtn.disabled = !existingMapping;
    } else {
        clearBtn.disabled = true;
    }
}

async function performMapping() {
    if (!state.selectedViennaSign || !state.selectedCountrySign) return;

    if (!state.mappings[state.currentCountry]) {
        state.mappings[state.currentCountry] = {};
    }

    // Vérifier si le panneau Vienna est déjà mappé à un autre panneau du pays
    const oldCountrySignForThisVienna = Object.entries(state.mappings[state.currentCountry]).find(
        ([_, viennaId]) => viennaId === state.selectedViennaSign
    )?.[0];

    // Si oui, supprimer l'ancien mapping
    if (oldCountrySignForThisVienna && oldCountrySignForThisVienna !== state.selectedCountrySign) {
        delete state.mappings[state.currentCountry][oldCountrySignForThisVienna];
        await saveMappingToServer(state.currentCountry, oldCountrySignForThisVienna, state.selectedViennaSign, true);
    }

    state.mappings[state.currentCountry][state.selectedCountrySign] = state.selectedViennaSign;

    // Sauvegarder en temps réel
    await saveMappingToServer(state.currentCountry, state.selectedCountrySign, state.selectedViennaSign, false);

    // Mettre à jour visuellement le panneau du pays
    const countryItem = document.querySelector(`[data-country-id="${state.selectedCountrySign}"]`);
    if (countryItem) {
        countryItem.classList.add('mapped');
        const existingBadge = countryItem.querySelector('[style*="background: #4caf50"]');
        if (!existingBadge) {
            const badge = document.createElement('div');
            badge.style.cssText = 'position: absolute; top: 4px; left: 4px; background: #4caf50; color: white; padding: 4px 8px; border-radius: 3px; font-size: 8px; font-weight: 600; z-index: 10; max-width: 95%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
            badge.textContent = state.selectedViennaSign;
            countryItem.appendChild(badge);
        }
    }

    // Mettre à jour les listes et affichages
    renderMappingsList();

    // Rafraîchir la mosaïque pour que les panneaux Vienna se mettent en vert
    setTimeout(() => {
        renderMappingArea();
    }, 100);

    clearSelection();
    showStatus('✓ Mapping sauvegardé en temps réel!', 'success');
}

async function saveMappingToServer(country, nationalId, viennaId, remove = false) {
    try {
        console.log(`📤 Envoi du mapping: ${country} ${nationalId} → ${viennaId}`);
        const response = await fetch('http://localhost:8001/save-mapping', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                country: country,
                national_id: nationalId,
                vienna_id: viennaId,
                remove: remove
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Mapping sauvegardé avec succès!`);

            // Recharger le fichier Vienna Convention pour mettre à jour les mappings
            setTimeout(() => {
                reloadMappingsFromFile();
            }, 100);
        } else {
            console.error('Erreur de sauvegarde:', response.statusText);
            showStatus('❌ Erreur lors de la sauvegarde', 'error');
        }
    } catch (error) {
        console.error('Impossible de sauvegarder sur le serveur:', error);
        showStatus('⚠️ Serveur non accessible. Vérifiez: python3 mapper/save_server.py', 'error');
    }
}

async function reloadMappingsFromFile() {
    try {
        // Recharger le fichier Vienna Convention avec cache-buster
        const cacheTime = new Date().getTime();
        const response = await fetch(`../vienna-convention/road_signs_all.json?t=${cacheTime}`);
        state.viennaConvention = await response.json();

        // Réinitialiser les mappings et les recharger depuis le fichier
        state.mappings = {};
        extractMappings();

        console.log(`🔄 Mappings rechargés depuis le serveur`);
    } catch (error) {
        console.error('Erreur lors du rechargement des mappings:', error);
    }
}

function clearSelection() {
    state.selectedViennaSign = null;
    state.selectedCountrySign = null;
    document.querySelectorAll('.panel-item').forEach(item => item.classList.remove('selected'));
    updateCenterInfo();
    updateMapperBtn();
}

function renderMappingsList() {
    const list = document.getElementById('mappingsList');

    if (!state.currentCountry || !state.mappings[state.currentCountry]) {
        list.innerHTML = `
            <div class="mappings-title">Mappings du pays sélectionné</div>
            <p style="color: #999; text-align: center; padding: 20px;">Aucun mapping pour ce pays</p>
        `;
        return;
    }

    const mappings = state.mappings[state.currentCountry];
    const mappingEntries = Object.entries(mappings).map(([nationalId, viennaId]) => `
        <div class="mapping-entry">
            <div class="mapping-from-to">
                <span class="mapping-id">${nationalId}</span>
                <span class="mapping-arrow">→</span>
                <span class="mapping-vienna">${viennaId}</span>
            </div>
            <button class="remove-mapping-btn" onclick="removeMapping('${nationalId}')">Supprimer</button>
        </div>
    `).join('');

    list.innerHTML = `
        <div class="mappings-title">Mappings du pays sélectionné</div>
        <div style="margin-bottom: 10px; font-size: 12px; color: #666;">
            Total: <strong>${Object.keys(mappings).length}</strong> mappings
        </div>
        ${mappingEntries}
    `;
}

async function removeMapping(nationalId) {
    if (state.mappings[state.currentCountry] && state.mappings[state.currentCountry][nationalId]) {
        const viennaId = state.mappings[state.currentCountry][nationalId];
        delete state.mappings[state.currentCountry][nationalId];

        // Sauvegarder la suppression en temps réel
        await saveMappingToServer(state.currentCountry, nationalId, viennaId, true);

        // Mettre à jour le panneau du pays
        const countryItem = document.querySelector(`[data-country-id="${nationalId}"]`);
        if (countryItem) {
            countryItem.classList.remove('mapped');
            const badge = countryItem.querySelector('[style*="background: #4caf50"]');
            if (badge) badge.remove();
        }

        // Mettre à jour le panneau Vienna
        const viennaItem = document.querySelector(`[data-vienna-id="${viennaId}"]`);
        if (viennaItem) {
            // Vérifier s'il y a d'autres mappings pour ce panneau Vienna
            const hasOtherMapping = Object.values(state.mappings[state.currentCountry] || {}).includes(viennaId);
            if (!hasOtherMapping) {
                viennaItem.classList.remove('mapped');
            }
        }

        renderMappingsList();
        showStatus('✓ Mapping supprimé et sauvegardé!', 'success');
    }
}

function showStatus(message, type = 'success') {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.className = `status-message ${type}`;
    statusDiv.textContent = message;
    setTimeout(() => {
        statusDiv.className = '';
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('exportBtn').addEventListener('click', () => {
        const dataStr = JSON.stringify(state.mappings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mappings_${new Date().getTime()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const text = await file.text();
            try {
                const data = JSON.parse(text);
                state.mappings = { ...state.mappings, ...data };
                renderMappingArea();
                renderMappingsList();
                showStatus('Mappings importés avec succès!', 'success');
            } catch (error) {
                showStatus('Erreur lors de l\'import du fichier', 'error');
            }
        }
    });


    // Initialiser l'application
    loadData();
});
