const Database = require('better-sqlite3');
const path = require('path');
const db = new Database('backend/data/nubeos.db');

const count = db.prepare('SELECT COUNT(*) as total FROM eo_media').get();
const types = db.prepare('SELECT type, COUNT(*) as count FROM eo_media GROUP BY type').all();
const samples = db.prepare('SELECT id, title, type, series_name FROM eo_media LIMIT 5').all();

console.log('Total Media:', count.total);
console.log('Types Distribution:', types);
console.log('Samples:', samples);
