#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'vienna-convention', 'road_signs_all.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

let removedDeclinations = 0;
let removedSigns = 0;

for (const cat of data.categories || []) {
  const catId = (cat.category || '').toUpperCase();
  if (!catId.startsWith('VIENNA-')) continue;

  const newSigns = [];
  for (const sign of cat.signs || []) {
    const ref = (sign.reference || '').trim();
    if (ref.startsWith('OTHER-')) {
      removedSigns++;
      continue;
    }
    const before = (sign.declinations || []).length;
    sign.declinations = (sign.declinations || []).filter((dec) => {
      const code = (dec.code || '').trim();
      if (code.startsWith('OTHER-')) {
        removedDeclinations++;
        return false;
      }
      return true;
    });
    if (sign.declinations.length === 0) {
      removedSigns++;
      continue;
    }
    newSigns.push(sign);
  }
  cat.signs = newSigns;
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
console.log('Removed ' + removedDeclinations + ' OTHER declinations from Vienna signs.');
console.log('Removed ' + removedSigns + ' signs from Vienna categories (OTHER-* refs or empty).');
