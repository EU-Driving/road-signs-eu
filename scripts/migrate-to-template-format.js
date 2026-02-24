#!/usr/bin/env node
/**
 * Migrates road_signs_all.json to template format.
 * Converts localizations from { reference, position: "center" } to { position: { center: reference } }.
 * Leaves already template-format localizations unchanged.
 */
const path = require('path');
const fs = require('fs');

const JSON_PATH = path.join(__dirname, '../vienna-convention/road_signs_all.json');

function toTemplateFormat(loc) {
  if (!loc || typeof loc !== 'object') return { position: {} };
  if (loc.position && typeof loc.position === 'object' && !Array.isArray(loc.position)) return loc;
  const ref = loc.reference;
  const pos = loc.position;
  if (ref && (pos === 'center' || pos === undefined)) return { position: { center: ref } };
  if (ref) return { position: { center: ref } };
  return { position: {} };
}

const raw = fs.readFileSync(JSON_PATH, 'utf-8');
const data = JSON.parse(raw);
let count = 0;

(data.categories || []).forEach((cat) => {
  (cat.signs || []).forEach((sign) => {
    (sign.declinations || []).forEach((dec) => {
      const locs = dec.localizations || {};
      Object.keys(locs).forEach((cc) => {
        const next = toTemplateFormat(locs[cc]);
        if (JSON.stringify(locs[cc]) !== JSON.stringify(next)) {
          locs[cc] = next;
          count++;
        }
      });
    });
  });
});

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
console.log('Migrated', count, 'localizations to template format. File:', JSON_PATH);
